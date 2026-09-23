import Link from "next/link";
import { prisma } from "@/lib/prisma";
import BlogCategoriesManager from "@/components/admin/BlogCategoriesManager";

export default async function BlogCategoriesPage() {
  const categories = await prisma.blogCategory.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { blogs: true } }, seoMeta: true },
  });

  const topLevelCount = categories.filter((c) => !c.parentId).length;
  const subCategoryCount = categories.length - topLevelCount;
  // A post can be filed under more than one category (see the multi-category
  // feature), so this totals post-to-category assignments, not distinct posts.
  const totalAssignments = categories.reduce((sum, c) => sum + c._count.blogs, 0);
  const missingSeoCount = categories.filter((c) => !c.seoMeta?.metaTitle).length;

  return (
    <div>
      <p className="text-sm text-gray-500">
        <Link href="/admin/blogs" className="hover:underline">
          Blog Posts
        </Link>{" "}
        / Categories
      </p>
      <h1 className="mt-1 text-2xl font-bold">Blog Categories</h1>
      <p className="mt-1 max-w-2xl text-sm text-gray-500">
        Add, rename, or remove the categories blog posts can be filed under — including
        sub-categories nested one level under a top-level category.
      </p>

      {/* Two columns on wide screens: the category list on the left, and a
          stats + tips sidebar on the right so the page uses the full width
          with purpose instead of leaving bare empty space next to the list. */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <BlogCategoriesManager
            initial={categories.map((c) => ({
              id: c.id,
              name: c.name,
              slug: c.slug,
              parentId: c.parentId,
              postCount: c._count.blogs,
              description: c.description ?? "",
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
                <dt className="text-gray-500">Top-Level Categories</dt>
                <dd className="font-semibold text-gray-900 dark:text-gray-100">{topLevelCount}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-500">Sub-Categories</dt>
                <dd className="font-semibold text-gray-900 dark:text-gray-100">{subCategoryCount}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-500">Posts Filed</dt>
                <dd className="font-semibold text-gray-900 dark:text-gray-100">{totalAssignments}</dd>
              </div>
            </dl>
            {missingSeoCount > 0 ? (
              <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                {missingSeoCount} categor{missingSeoCount === 1 ? "y is" : "ies are"} missing a meta
                title — open &quot;SEO&quot; on a row to add one.
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="font-semibold">How This Works</h2>
            <ul className="mt-3 space-y-3 text-sm leading-relaxed text-gray-500">
              <li>
                Every category — top-level or sub — gets its own public page with the same design.
              </li>
              <li>
                Open &quot;SEO&quot; on any category to set its meta title, description, and the
                100–150 word intro shown on its page.
              </li>
              <li>
                Sub-categories nest one level under a top-level category — use &quot;+
                Sub-Category&quot; on a row to add one.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
