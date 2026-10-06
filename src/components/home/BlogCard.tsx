import Link from "next/link";
import type { D2Blog } from "@/lib/homepage-data";

/**
 * A blog card for home page Design 2. Every card has the same shape whatever
 * the post: fixed image ratio, title cut to 2 lines, summary to 3 lines (and
 * already trimmed to the admin's word limit), button pinned to the bottom.
 */
export default function BlogCard({ blog, buttonText }: { blog: D2Blog; buttonText: string }) {
  return (
    <Link
      href={`/blog/${blog.slug}`}
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
      </div>
      <div className="flex flex-1 flex-col p-6">
        <p className="text-xs font-medium text-blue-200/80">{blog.date}</p>
        <h3 className="mt-2 line-clamp-2 min-h-[3rem] text-lg font-bold leading-6">{blog.title}</h3>
        {blog.excerpt ? (
          <p className="mt-3 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-blue-50/85">{blog.excerpt}</p>
        ) : null}
        {buttonText ? (
          <div className="mt-auto pt-6">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold transition group-hover:bg-blue-500">
              {buttonText}
              <span aria-hidden className="transition group-hover:translate-x-0.5">
                →
              </span>
            </span>
          </div>
        ) : null}
      </div>
    </Link>
  );
}
