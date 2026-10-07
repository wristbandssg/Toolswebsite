import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { initialsFor } from "@/lib/authors";
import { authorUrl } from "@/lib/urls";

export default async function AuthorsListPage() {
  const authors = await prisma.author.findMany({
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    include: { _count: { select: { blogs: true, tools: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Authors</h1>
          <p className="mt-1 text-sm text-gray-500">
            Author profiles. Their bio shows only on single blog posts and single calculator pages, and each
            one has a profile page at /authors/[slug].
          </p>
        </div>
        <Link
          href="/admin/authors/new"
          className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + New Author
        </Link>
      </div>

      {authors.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-300 p-10 text-center dark:border-gray-700">
          <p className="font-medium">No authors yet</p>
          <p className="mt-1 text-sm text-gray-500">
            Add your first author. It becomes the default and appears on every post and calculator right away.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {authors.map((a) => (
            <div
              key={a.id}
              className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-center gap-3">
                {a.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.photo} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-white">
                    {initialsFor(a.name)}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    {a.name}
                    {a.isDefault ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900">
                        Default
                      </span>
                    ) : null}
                  </p>
                  {a.jobTitle ? <p className="truncate text-sm text-gray-500">{a.jobTitle}</p> : null}
                </div>
              </div>
              {a.shortBio ? <p className="mt-3 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">{a.shortBio}</p> : null}
              <p className="mt-3 text-xs text-gray-500">
                {a._count.blogs} blog {a._count.blogs === 1 ? "post" : "posts"} · {a._count.tools}{" "}
                {a._count.tools === 1 ? "calculator" : "calculators"}
                {a.isDefault ? " (+ everything with no author picked)" : ""}
              </p>
              <div className="mt-auto flex gap-2 pt-4">
                <Link
                  href={`/admin/authors/${a.id}`}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Edit
                </Link>
                <a
                  href={authorUrl(a.slug)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  View Profile →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
