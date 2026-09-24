"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  published: "Published",
  needs_update: "Needs Update",
};

export interface ToolRow {
  id: string;
  slug: string;
  title: string;
  status: string;
  templateKey: string;
  // Pre-formatted on the server (Date -> locale string) so this stays a
  // plain client component with no server/client date-formatting mismatch.
  updatedAtLabel: string;
  category: { id: string; name: string } | null;
}

/**
 * The admin Tools list — search by title, filter by status and by category,
 * all client-side against the full tool list the server already loaded (no
 * extra round-trip). "All Statuses" / "All Categories" are the defaults, so
 * with no filters set every tool is shown, same as before. Mirrors the
 * BlogPostsList admin component for a consistent search/filter experience
 * across the admin panel.
 */
export default function ToolsList({
  tools: initialTools,
  categories,
}: {
  tools: ToolRow[];
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [tools, setTools] = useState(initialTools);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tools.filter((tool) => {
      if (q && !tool.title.toLowerCase().includes(q)) return false;
      if (statusFilter !== "all" && tool.status !== statusFilter) return false;
      if (categoryFilter !== "all" && tool.category?.id !== categoryFilter) return false;
      return true;
    });
  }, [tools, search, statusFilter, categoryFilter]);

  async function handleDelete(tool: ToolRow) {
    if (
      !window.confirm(
        `Delete "${tool.title}"? This permanently removes the tool and its content — this can't be undone.`
      )
    ) {
      return;
    }
    setDeletingSlug(tool.slug);
    setError(null);
    try {
      const res = await fetch(`/api/tools/${tool.slug}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not delete the tool.");
        return;
      }
      setTools((prev) => prev.filter((t) => t.slug !== tool.slug));
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setDeletingSlug(null);
    }
  }

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
            placeholder="Search tools by title..."
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
          Showing {filtered.length} of {tools.length} tool{tools.length === 1 ? "" : "s"}
        </p>
      ) : null}

      {error ? (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 dark:bg-gray-950">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Template</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.map((tool) => (
              <tr key={tool.id}>
                <td className="px-4 py-3 font-medium">{tool.title}</td>
                <td className="px-4 py-3 text-gray-500">{tool.category?.name ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500">{tool.templateKey}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800">
                    {STATUS_LABEL[tool.status] ?? tool.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{tool.updatedAtLabel}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    {tool.status === "published" ? (
                      <a
                        href={`/tools/${tool.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-500 hover:text-gray-800 hover:underline dark:hover:text-gray-200"
                      >
                        View
                      </a>
                    ) : null}
                    <Link href={`/admin/tools/${tool.slug}`} className="text-indigo-600 hover:underline">
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(tool)}
                      disabled={deletingSlug === tool.slug}
                      className="text-red-600 hover:underline disabled:opacity-50"
                    >
                      {deletingSlug === tool.slug ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  {tools.length === 0
                    ? "No tools have been created yet."
                    : "No tools match your search/filters."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
