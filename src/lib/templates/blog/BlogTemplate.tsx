import Link from "next/link";
import type { BlogTemplateProps } from "./types";
import TableOfContents from "@/components/TableOfContents";
import ReadingProgressBar from "@/components/ReadingProgressBar";
import { extractTableOfContents, estimateReadingMinutes } from "@/lib/toc";

// A small fixed palette so an author's initials-avatar color stays the same
// every time their name appears (no photo field on the User model yet).
const AVATAR_COLORS = [
  "bg-rose-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-fuchsia-500",
];

function avatarColorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

/** One entry in the "More Articles" sidebar card. */
function RelatedPostRow({
  blog,
}: {
  blog: { slug: string; title: string; publishedAt: string | null; categoryName?: string | null };
}) {
  return (
    <a
      href={`/blog/${blog.slug}`}
      className="block px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
    >
      {blog.categoryName ? (
        <p className="text-[11px] font-bold uppercase tracking-wide text-rose-600 dark:text-rose-400">
          {blog.categoryName}
        </p>
      ) : null}
      <p className="mt-0.5 text-sm font-semibold leading-snug text-gray-900 dark:text-gray-100">
        {blog.title}
      </p>
      {blog.publishedAt ? (
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-500">
          {new Date(blog.publishedAt).toLocaleDateString()}
        </p>
      ) : null}
    </a>
  );
}

/**
 * The single Blog Template — every blog post uses this same layout; only
 * content differs. Header section checked against a live reference site
 * (nextstair.com/alternatives/surfshark-alternatives): a category label,
 * then the title, then the post's short description, then an author row
 * (avatar, name, updated date, reading time) — all as one header block,
 * full width. Below that is a distinct, softly-shaded body section: a
 * sticky, scroll-spy Table of Contents on the left (auto-built from the
 * post's own H2/H3 headings), the article in the middle, and — on wide
 * screens — a "More Articles" card on the right, mirroring the reference's
 * layout. Every panel collapses gracefully on narrower screens: the TOC
 * hides below `lg`, the sidebar card drops beneath the article below `xl`
 * instead of being squeezed into a cramped third column.
 */
export default function BlogTemplate({ blog, relatedTools, relatedBlogs }: BlogTemplateProps) {
  const { html: contentHtml, headings } = extractTableOfContents(blog.content);
  const readingMinutes = estimateReadingMinutes(blog.content);
  const authorName = blog.authorName ?? "Editorial Team";

  const relatedCard =
    relatedBlogs.length > 0 ? (
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="bg-gradient-to-r from-amber-500 to-orange-400 px-4 py-2.5">
          <p className="text-xs font-bold uppercase tracking-wide text-white">More Articles</p>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {relatedBlogs.map((b) => (
            <RelatedPostRow key={b.slug} blog={b} />
          ))}
        </div>
      </div>
    ) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <ReadingProgressBar />

      {/* Header section: category, title, short description, author/meta row */}
      <header>
        {blog.categoryName ? (
          blog.categorySlug ? (
            <Link
              href={`/blog/category/${blog.categorySlug}`}
              className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-indigo-700 ring-1 ring-inset ring-indigo-200 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/20 dark:hover:bg-indigo-500/20"
            >
              {blog.categoryName}
            </Link>
          ) : (
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-indigo-700 ring-1 ring-inset ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/20">
              {blog.categoryName}
            </span>
          )
        ) : null}

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
          {blog.title}
        </h1>

        {blog.excerpt ? (
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-700 dark:text-gray-300 sm:text-lg">
            {blog.excerpt}
          </p>
        ) : null}

        <div className="mt-6 flex items-center gap-3 border-b border-gray-200 pb-6 dark:border-gray-800">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white shadow-sm ring-2 ring-white dark:ring-gray-950 ${avatarColorFor(authorName)}`}
          >
            {initialsFor(authorName)}
          </span>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
            <span>
              By <span className="font-semibold text-gray-900 dark:text-gray-100">{authorName}</span>
            </span>
            <span className="text-gray-300 dark:text-gray-700">·</span>
            <span>Updated {new Date(blog.updatedAt).toLocaleDateString()}</span>
            <span className="text-gray-300 dark:text-gray-700">·</span>
            <span className="font-medium text-indigo-600 dark:text-indigo-400">
              {readingMinutes} min read
            </span>
          </div>
        </div>

        {blog.featuredImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={blog.featuredImage}
            alt={blog.title}
            className="mt-8 aspect-video w-full rounded-2xl object-cover shadow-lg ring-1 ring-gray-900/5"
          />
        ) : null}
      </header>

      {/* Body section: a softly-shaded panel holding the TOC, article and
          "More Articles" sidebar, visually set apart from the header above. */}
      <div className="mt-10 rounded-3xl border border-gray-100 bg-gray-50/60 p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/30 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr] xl:grid-cols-[220px_1fr_280px]">
          <TableOfContents headings={headings} />

          <article className="min-w-0">
            <div
              className="prose max-w-none dark:prose-invert prose-headings:scroll-mt-24 prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-gray-900 dark:prose-headings:text-gray-50 prose-p:leading-relaxed prose-p:text-gray-800 dark:prose-p:text-gray-300 prose-a:font-medium prose-a:text-indigo-600 prose-a:no-underline prose-a:underline-offset-2 hover:prose-a:underline dark:prose-a:text-indigo-400 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-blockquote:border-l-4 prose-blockquote:border-indigo-300 prose-blockquote:font-medium prose-blockquote:not-italic prose-blockquote:text-gray-700 dark:prose-blockquote:border-indigo-700 dark:prose-blockquote:text-gray-300 prose-code:rounded prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:font-normal prose-code:text-indigo-600 prose-code:before:content-none prose-code:after:content-none dark:prose-code:bg-gray-800 dark:prose-code:text-indigo-400 prose-img:rounded-2xl prose-img:shadow-md prose-li:text-gray-800 dark:prose-li:text-gray-300"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />

            {relatedTools.length > 0 ? (
              <section className="mt-10 border-t border-gray-200 pt-6 dark:border-gray-800">
                <h2 className="mb-2 text-lg font-semibold">সম্পর্কিত Calculator</h2>
                <ul className="flex flex-wrap gap-2">
                  {relatedTools.map((t) => (
                    <li key={t.slug}>
                      <a
                        href={`/tools/${t.slug}`}
                        className="rounded-full border border-gray-300 bg-white px-3 py-1 text-sm transition-colors hover:border-indigo-300 hover:text-indigo-600 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-indigo-700"
                      >
                        {t.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* Below `xl` the sidebar card has no room of its own, so it
                drops in here instead of being squeezed into the grid. */}
            {relatedCard ? <div className="mt-10 xl:hidden">{relatedCard}</div> : null}
          </article>

          {relatedCard ? (
            <aside className="hidden xl:block">
              <div className="sticky top-6">{relatedCard}</div>
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
}
