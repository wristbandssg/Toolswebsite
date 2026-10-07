import Link from "next/link";
import { prisma } from "@/lib/prisma";
import BlogCategoriesManager from "@/components/admin/BlogCategoriesManager";

export const dynamic = "force-dynamic";

export default async function BlogCategoriesPage() {
  const categories = await prisma.blogCategory.findMany({
    orderBy: { name: "asc" },
    include: { seoMeta: true, blogs: { select: { status: true } } },
  });

  // A post can be filed under more than one category, so this totals
  // post-to-category assignments, not distinct posts.
  const totalAssignments = categories.reduce((sum, c) => sum + c.blogs.length, 0);
  const emptyCount = categories.filter((c) => c.blogs.length === 0).length;
  const missingSeoCount = categories.filter((c) => !c.seoMeta?.metaTitle).length;

  return (
    <div>
      <p className="text-sm text-gray-500">
        <Link href="/admin/blogs" className="hover:underline">
          Blog
        </Link>{" "}
        / Categories
      </p>
      <h1 className="mt-1 text-2xl font-bold">Blog Categories</h1>
      <p className="mt-1 max-w-2xl text-sm text-gray-500">
        Add, edit, or remove the categories blog posts can be filed under. Each one gets its own public page — Edit a row
        to change its name, URL or intro, open Content to write the article under its posts, or SEO to set its meta
        title, description, and indexing.
      </p>

      {/* Same two-column layout as Calculator Categories: the list, and a stats + tips sidebar. */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <BlogCategoriesManager
            initial={categories.map((c) => ({
              id: c.id,
              name: c.name,
              slug: c.slug,
              parentId: c.parentId,
              description: c.description ?? "",
              postCount: c.blogs.length,
              publishedCount: c.blogs.filter((b) => b.status === "published").length,
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
                <dd className="font-semibold text-gray-900 dark:text-gray-100">{categories.length}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-500">Posts Filed</dt>
                <dd className="font-semibold text-gray-900 dark:text-gray-100">{totalAssignments}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-500">Empty Categories</dt>
                <dd className="font-semibold text-gray-900 dark:text-gray-100">{emptyCount}</dd>
              </div>
            </dl>
            {missingSeoCount > 0 ? (
              <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                {missingSeoCount} categor{missingSeoCount === 1 ? "y is" : "ies are"} missing a meta title — open
                &quot;SEO&quot; on a row to add one.
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="font-semibold">How This Works</h2>
            <ul className="mt-3 space-y-3 text-sm leading-relaxed text-gray-500">
              <li>Every category — top-level or sub — gets the same public page design: its intro, then its posts.</li>
              <li>
                Open &quot;Edit&quot; on a row to change its name, URL slug, intro, or parent. A changed URL 301-redirects
                from the old one automatically.
              </li>
              <li>Open &quot;Content&quot; on a row to write the long article shown under the category&apos;s posts.</li>
              <li>
                Open &quot;SEO&quot; on a row to set its meta title, description, canonical URL, and indexing — right
                here, no separate page.
              </li>
              <li>Sub-categories nest one level under a top-level category — use &quot;+ Sub-Category&quot; on a row.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
