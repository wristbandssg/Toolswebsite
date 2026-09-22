import Link from "next/link";
import type { BlogTemplateProps } from "./types";
import TableOfContents from "@/components/TableOfContents";
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

/**
 * The single Blog Template — every blog post uses this same layout; only
 * content differs. Header section checked against a live reference site
 * (nextstair.com/alternatives/surfshark-alternatives): a category label,
 * then the title, then the post's short description, then an author row
 * (avatar, name, updated date, reading time) — all as one header block,
 * full width. Below that is a separate section: a two-column body with a
 * sticky, scroll-spy Table of Contents on the left (auto-built from the
 * post's own H2/H3 headings) and the article in the main column. The
 * sidebar is skipped entirely for short posts with no headings.
 */
export default function BlogTemplate({ blog, relatedTools, relatedBlogs }: BlogTemplateProps) {
  const { html: contentHtml, headings } = extractTableOfContents(blog.content);
  const readingMinutes = estimateReadingMinutes(blog.content);
  const authorName = blog.authorName ?? "Editorial Team";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header section: category, title, short description, author/meta row */}
      <header>
        {blog.categoryName ? (
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">
            {blog.categorySlug ? (
              <Link href={`/blog/category/${blog.categorySlug}`} className="hover:underline">
                {blog.categoryName}
              </Link>
            ) : (
              blog.categoryName
            )}
          </p>
        ) : null}

        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{blog.title}</h1>

        {blog.excerpt ? (
          <p className="mt-3 max-w-3xl text-lg text-gray-500">{blog.excerpt}</p>
        ) : null}

        <div className="mt-5 flex items-center gap-3 border-b border-gray-100 pb-5 dark:border-gray-800">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarColorFor(authorName)}`}
          >
            {initialsFor(authorName)}
          </span>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500">
            <span>
              By <span className="font-medium text-gray-700 dark:text-gray-300">{authorName}</span>
            </span>
            <span className="text-gray-300 dark:text-gray-700">·</span>
            <span>Updated {new Date(blog.updatedAt).toLocaleDateString()}</span>
            <span className="text-gray-300 dark:text-gray-700">·</span>
            <span>{readingMinutes} min read</span>
          </div>
        </div>

        {blog.featuredImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={blog.featuredImage}
            alt={blog.title}
            className="mt-6 aspect-video w-full rounded-xl object-cover"
          />
        ) : null}
      </header>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">
        <TableOfContents headings={headings} />

        <article className="min-w-0">
          <div
            className="prose max-w-none dark:prose-invert"
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
                      className="rounded-full border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                    >
                      {t.title}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {relatedBlogs.length > 0 ? (
            <section className="mt-6">
              <h2 className="mb-2 text-lg font-semibold">আরও পড়ুন</h2>
              <ul className="space-y-2">
                {relatedBlogs.map((b) => (
                  <li key={b.slug}>
                    <a href={`/blog/${b.slug}`} className="text-indigo-600 hover:underline">
                      {b.title}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </article>
      </div>
    </div>
  );
}
