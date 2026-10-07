import Link from "next/link";
import type { D2Blog } from "@/lib/homepage-data";
import { blogUrl } from "@/lib/urls";

/**
 * A compact blog card for home page Design 2. Every card has the same shape
 * whatever the post: fixed image ratio, title cut to 2 lines, summary to 2
 * lines (already trimmed to the admin's word limit). The button text only
 * appears on hover, over the picture, so it never adds height.
 */
export default function BlogCard({ blog, buttonText }: { blog: D2Blog; buttonText: string }) {
  return (
    <Link
      href={blogUrl(blog.slug)}
      className="group flex h-full flex-col overflow-hidden rounded-2xl bg-gradient-to-b from-[#16378a] to-[#102a6b] text-white shadow-lg shadow-blue-950/15 ring-1 ring-white/5 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-950/25"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-blue-900">
        {blog.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={blog.image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-800 text-5xl">📰</div>
        )}
        {blog.category ? (
          <span className="absolute left-3 top-3 max-w-[70%] truncate rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-blue-800 shadow">
            {blog.category}
          </span>
        ) : null}
        {buttonText ? (
          <span className="absolute inset-0 flex items-center justify-center bg-blue-950/45 opacity-0 transition duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
            <span className="inline-flex translate-y-2 items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold shadow-lg transition duration-300 group-hover:translate-y-0">
              {buttonText}
              <span aria-hidden>→</span>
            </span>
          </span>
        ) : null}
      </div>
      <div className="flex-1 px-5 pb-5 pt-4">
        <h3 className="line-clamp-2 min-h-[3rem] text-lg font-bold leading-6 group-hover:text-blue-100">{blog.title}</h3>
        {blog.excerpt ? (
          <p className="mt-2 line-clamp-2 min-h-[3rem] text-sm leading-6 text-blue-50/80">{blog.excerpt}</p>
        ) : null}
      </div>
    </Link>
  );
}
