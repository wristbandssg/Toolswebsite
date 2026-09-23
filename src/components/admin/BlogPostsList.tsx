"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  published: "Published",
  needs_update: "Needs Update",
};

export interface BlogPostRow {
  id: string;
  slug: string;
  title: string;
  status: string;
  // Pre-formatted on the server (Date -> locale string) so this stays a
  // plain client component with no server/client date-formatting mismatch.
  updatedAtLabel: string;
  categories: { id: string; name: string }[];
  toolCount: number;
}

/**
 * The admin Blog Posts list — search by title, filter by status and by
 * category, all client-side against the full post list the server already
 * loaded (no extra round-trip). "All Statuses" / "All Categories" are the
 * defaults, so with no filters set every post is shown, same as before.
 */
export default function BlogPostsList({
  posts,
  categories,
}: {
  posts: BlogPostRow[];
  categories: { id: string; name: string }[];
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts.filter((post) => {
      if (q && !post.title.toLowerCase().includes(q)) return false;
      if (statusFilter !== "all" && post.status !== statusFilter) return false;
      if (categoryFilter !== "all" && !post.categories.some((c) => c.id === categoryFilter)) {
        return false;
      }
      return true;
    });
  }, [posts, search, statusFilter, categoryFilter]);

  const hasActiveFilters = search.trim() !== "" || statusFilter !== "all" || categoryFilter !== "all";

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setCategoryFilter("all");
  }

  return (
    <div>
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          >
            <circle cx="9" cy="9" r="6" />
            <path d="m17 17-4-4" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search posts by title..."
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm dark:border-gray-700 dark:bg-gray-800"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <option value="all">All Statuses</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={clearFilters}
            className="shrink-0 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Clear
          </button>
        ) : null}
      </div>

      {hasActiveFilters ? (
        <p className="mt-2 px-1 text-xs text-gray-400">
          Showing {filtered.length} of {posts.length} post{posts.length === 1 ? "" : "s"}
        </p>
      ) : null}

      <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 dark:bg-gray-950">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Linked Tools</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.map((blog) => (
              <tr key={blog.id}>
                <td className="px-4 py-3 font-medium">{blog.title}</td>
                <td className="px-4 py-3 text-gray-500">
                  {blog.categories.length > 0
                    ? blog.categories.map((c) => c.name).join(", ")
                    : "—"}
                </td>
                <td className="px-4 py-3 text-gray-500">{blog.toolCount}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800">
                    {STATUS_LABEL[blog.status] ?? blog.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{blog.updatedAtLabel}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    {blog.status === "published" ? (
                      <a
                        href={`/blog/${blog.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-500 hover:text-gray-800 hover:underline dark:hover:text-gray-200"
                      >
                        View
                      </a>
                    ) : null}
                    <Link href={`/admin/blogs/${blog.slug}`} className="text-indigo-600 hover:underline">
                      Edit
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  {posts.length === 0
                    ? "No blog posts yet."
                    : "No posts match your search/filters."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
