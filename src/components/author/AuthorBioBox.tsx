import Link from "next/link";
import type { AuthorProfile } from "@/lib/authors";
import { AuthorAvatar, AuthorSocialLinks } from "./AuthorParts";

/**
 * "About the Author" card. Used ONLY on single blog posts (BlogTemplate) and
 * single calculator pages (ToolContentSections), by request. Don't add it
 * to list pages, the home page or anywhere else.
 */
export default function AuthorBioBox({
  author,
  label = "About the Author",
}: {
  author: AuthorProfile;
  label?: string;
}) {
  const href = `/authors/${author.slug}`;
  return (
    <section
      aria-label={label}
      className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-5 shadow-sm dark:border-indigo-900/60 dark:from-indigo-950/40 dark:via-gray-900 dark:to-violet-950/30 sm:p-6"
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-indigo-500 to-violet-500" />
      <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">{label}</p>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
        <Link href={href} className="shrink-0">
          <AuthorAvatar author={author} className="h-20 w-20 text-xl ring-4 ring-white shadow-md dark:ring-gray-900" />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Link
                href={href}
                className="text-lg font-bold text-gray-900 hover:text-indigo-600 dark:text-gray-50 dark:hover:text-indigo-400"
              >
                {author.name}
              </Link>
              {author.jobTitle ? (
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{author.jobTitle}</p>
              ) : null}
            </div>
            <AuthorSocialLinks author={author} />
          </div>

          {author.shortBio ? (
            <p className="mt-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{author.shortBio}</p>
          ) : null}

          {author.expertise.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {author.expertise.slice(0, 5).map((e) => (
                <li
                  key={e}
                  className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-100 dark:bg-gray-900 dark:text-indigo-300 dark:ring-indigo-900"
                >
                  {e}
                </li>
              ))}
            </ul>
          ) : null}

          <Link
            href={href}
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
          >
            View full profile <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
