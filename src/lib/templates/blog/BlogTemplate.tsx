import Link from "next/link";
import type { BlogTemplateProps } from "./types";

/** The single Blog Template — every blog post uses this same layout; only content differs. */
export default function BlogTemplate({ blog, relatedTools, relatedBlogs }: BlogTemplateProps) {
  return (
    <article className="mx-auto max-w-2xl px-4 py-8">
      <nav className="mb-4 text-sm text-gray-500">
        <Link href="/">Home</Link> / <Link href="/blog">Blog</Link> / {blog.title}
      </nav>

      {blog.featuredImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={blog.featuredImage}
          alt={blog.title}
          className="mb-6 aspect-video w-full rounded-xl object-cover"
        />
      ) : null}

      <h1 className="text-3xl font-bold">{blog.title}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
        {blog.authorName ? <span>{blog.authorName}</span> : null}
        {blog.publishedAt ? <span>· {new Date(blog.publishedAt).toLocaleDateString()}</span> : null}
        {blog.tags.map((tag) => (
          <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 dark:bg-gray-800">
            {tag}
          </span>
        ))}
      </div>

      <div
        className="prose mt-8 max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: blog.content }}
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
  );
}
