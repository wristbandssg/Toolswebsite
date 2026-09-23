import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { buildSeoMetadata, excerptFromHtml } from "@/lib/seo";
import CategoryHeroSlider from "@/components/CategoryHeroSlider";

// ক্যাটাগরি পেজও সবসময় সর্বশেষ Published Post দেখাবে, তাই Blog List-এর মতোই
// Build-time Static Prerender বন্ধ রাখা হলো।
export const dynamic = "force-dynamic";

// How many posts the paginated card grid shows per page (below the hero +
// featured list, which are only ever shown on page 1).
const GRID_PAGE_SIZE = 9;
// Up to this many of the newest posts go in the hero slider...
const HERO_SLIDES = 4;
// ...and up to this many of the next-newest go in the plain featured list.
const FEATURED_COUNT = 3;

async function loadCategory(slug: string) {
  const category = await prisma.blogCategory.findUnique({
    where: { slug },
    include: { seoMeta: true, parent: true },
  });
  if (!category) return null;
  const blogs = await prisma.blog.findMany({
    where: { status: "published", categoryIds: { has: category.id } },
    orderBy: { publishedAt: "desc" },
  });
  return { category, blogs };
}

function formatDate(d: Date | null) {
  if (!d) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function firstTags(tagsJson: string, max = 2): string[] {
  try {
    const parsed = JSON.parse(tagsJson) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t): t is string => typeof t === "string").slice(0, max);
  } catch {
    return [];
  }
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
    fallbackTitle: `${data.category.name} — Blog`,
    fallbackDescription:
      data.category.description || `${data.category.name} বিষয়ক সব Article এখানে দেখুন।`,
    path: `/blog/category/${data.category.slug}`,
  });
}

export default async function BlogCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const data = await loadCategory(slug);
  if (!data) notFound();
  const { category, blogs } = data;

  // Newest posts fill the hero slider, then the plain featured list, both
  // shown only on page 1. Everything after that is the paginated card grid
  // below — so on a small blog the hero/featured alone can cover every post
  // and the grid + pagination simply don't render, rather than showing an
  // empty section.
  const heroPosts = blogs.slice(0, HERO_SLIDES);
  const afterHero = blogs.slice(heroPosts.length);
  const featuredPosts = afterHero.slice(0, FEATURED_COUNT);
  const gridPosts = afterHero.slice(featuredPosts.length);

  const totalGridPages = Math.max(1, Math.ceil(gridPosts.length / GRID_PAGE_SIZE));
  const requestedPage = Number(pageParam ?? "1");
  const currentPage = Number.isFinite(requestedPage)
    ? Math.min(Math.max(1, Math.trunc(requestedPage)), totalGridPages)
    : 1;
  const pageItems = gridPosts.slice(
    (currentPage - 1) * GRID_PAGE_SIZE,
    currentPage * GRID_PAGE_SIZE
  );
  const hasOlderEntries = currentPage < totalGridPages;

  return (
    <div className="bg-white dark:bg-gray-950">
      {/* Full-bleed colored hero band, centered — breadcrumb, title, and
          the category's own 100–150 word intro (set from the admin), same
          treatment as a blog post's own header. */}
      <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 dark:from-indigo-800 dark:via-blue-800 dark:to-indigo-900">
        <div className="mx-auto max-w-6xl px-4 py-12 text-center sm:py-16">
          <p className="text-sm text-indigo-100">
            <Link href="/blog" className="hover:underline">
              Blog
            </Link>{" "}
            {category.parent ? (
              <>
                /{" "}
                <Link href={`/blog/category/${category.parent.slug}`} className="hover:underline">
                  {category.parent.name}
                </Link>{" "}
              </>
            ) : null}
            / {category.name}
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {category.name}
          </h1>
          <div className="mx-auto mt-3 h-1 w-16 rounded-full bg-white/40" />

          {category.description ? (
            <p className="mx-auto mt-5 max-w-4xl text-indigo-100 sm:text-lg">
              {category.description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        {blogs.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-dashed border-gray-200 px-6 py-16 text-center text-gray-400 dark:border-gray-800">
            এই ক্যাটাগরিতে এখনো কোনো Blog Post Publish হয়নি।
          </p>
        ) : (
          <>
            {currentPage === 1 && heroPosts.length > 0 ? (
              <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr]">
                <CategoryHeroSlider
                  slides={heroPosts.map((b) => ({
                    slug: b.slug,
                    title: b.title,
                    excerpt: b.excerpt || excerptFromHtml(b.content, 140),
                    image: b.featuredImage,
                  }))}
                />

                {featuredPosts.length > 0 ? (
                  <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
                    {featuredPosts.map((post) => {
                      const tags = firstTags(post.tags);
                      return (
                        <Link
                          key={post.id}
                          href={`/blog/${post.slug}`}
                          className="group flex gap-4 py-4 first:pt-0 last:pb-0"
                        >
                          <span className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-indigo-950 dark:to-blue-950">
                            {post.featuredImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={post.featuredImage}
                                alt={post.title}
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </span>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 dark:text-gray-100 dark:group-hover:text-indigo-400">
                              {post.title}
                            </h3>
                            <p className="mt-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                              {formatDate(post.publishedAt)}
                              {tags.length > 0 ? ` | ${[category.name, ...tags].join(", ")}` : ` | ${category.name}`}
                            </p>
                            <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                              {post.excerpt || excerptFromHtml(post.content, 110)}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}

            {pageItems.length > 0 ? (
              <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {pageItems.map((post) => {
                  const tags = firstTags(post.tags);
                  return (
                    <article key={post.id} className="flex flex-col">
                      <Link
                        href={`/blog/${post.slug}`}
                        className="block aspect-video overflow-hidden rounded-xl bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-indigo-950 dark:to-blue-950"
                      >
                        {post.featuredImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={post.featuredImage}
                            alt={post.title}
                            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                          />
                        ) : null}
                      </Link>
                      <Link href={`/blog/${post.slug}`} className="mt-4">
                        <h2 className="font-semibold text-gray-900 hover:text-indigo-600 dark:text-gray-100 dark:hover:text-indigo-400">
                          {post.title}
                        </h2>
                      </Link>
                      <p className="mt-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
                        {formatDate(post.publishedAt)}
                        {tags.length > 0 ? ` | ${[category.name, ...tags].join(", ")}` : ` | ${category.name}`}
                      </p>
                      <p className="mt-2 line-clamp-3 text-sm text-gray-600 dark:text-gray-400">
                        {post.excerpt || excerptFromHtml(post.content, 140)}
                      </p>
                      <Link
                        href={`/blog/${post.slug}`}
                        className="mt-2 text-sm font-semibold text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
                      >
                        read more
                      </Link>
                    </article>
                  );
                })}
              </div>
            ) : null}

            {hasOlderEntries ? (
              <div className="mt-12">
                <Link
                  href={`/blog/category/${category.slug}?page=${currentPage + 1}`}
                  className="text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  « Older Entries
                </Link>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
