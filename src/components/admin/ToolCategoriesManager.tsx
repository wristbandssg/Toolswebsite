"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface ToolCategorySeo {
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  robotsIndex: boolean;
  schemaType: string;
}

export interface ToolCategoryRow {
  id: string;
  name: string;
  slug: string;
  // Hero section content for this category's public /tools/category/[slug]
  // page (see the page component) — both blank until the admin fills them
  // in below; the public page generates fallback copy until then.
  heroSubheading: string;
  heroDescription: string;
  toolCount: number;
  seo: ToolCategorySeo;
}

const EMPTY_SEO: ToolCategorySeo = {
  metaTitle: "",
  metaDescription: "",
  canonicalUrl: "",
  robotsIndex: true,
  schemaType: "",
};

/** A small calculator icon badge, matching the visual language of the Blog
 * Categories manager's folder icon — gives each row a bit of color and
 * identity instead of a bare text list. */
function CategoryIcon() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
      <svg
        viewBox="0 0 20 20"
        fill="none"
        className="h-4 w-4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="4" y="2.5" width="12" height="15" rx="1.5" />
        <path d="M7 6h6M7 9.5h.01M10 9.5h.01M13 9.5h.01M7 12.5h.01M10 12.5h.01M13 12.5h.01" />
      </svg>
    </span>
  );
}

export default function ToolCategoriesManager({ initial }: { initial: ToolCategoryRow[] }) {
  const router = useRouter();
  const [categories, setCategories] = useState<ToolCategoryRow[]>(initial);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingHeroSubheading, setEditingHeroSubheading] = useState("");
  const [editingHeroDescription, setEditingHeroDescription] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // SEO panel — inline on this same page, the same pattern as the Blog
  // Categories manager, rather than a link out to the general SEO Manager
  // (a category's SEO fields are edited and saved right here).
  const [seoOpenId, setSeoOpenId] = useState<string | null>(null);
  const [seoDraft, setSeoDraft] = useState<ToolCategorySeo>(EMPTY_SEO);
  const [savingSeoId, setSavingSeoId] = useState<string | null>(null);
  const [seoError, setSeoError] = useState<string | null>(null);

  // A 500 from a stale Prisma Client (schema field not yet pushed to the
  // DB) comes back as an HTML error page, not JSON — `.json()` on that
  // throws, so this lets the caller build an honest error message from the
  // status code instead of a raw exception.
  async function safeJson(res: Response): Promise<{ error?: string } | null> {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/tool-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create the category.");
        return;
      }
      setCategories((prev) =>
        [...prev, { ...data.category, seo: EMPTY_SEO } as ToolCategoryRow].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );
      setNewName("");
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setCreating(false);
    }
  }

  function startEditing(cat: ToolCategoryRow) {
    setEditingId(cat.id);
    setEditingName(cat.name);
    setEditingHeroSubheading(cat.heroSubheading);
    setEditingHeroDescription(cat.heroDescription);
    setSeoOpenId(null);
    setError(null);
  }

  async function handleRename(id: string) {
    if (!editingName.trim()) return;
    setSavingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/tool-categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingName.trim(),
          heroSubheading: editingHeroSubheading.trim(),
          heroDescription: editingHeroDescription.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save the category.");
        return;
      }
      setCategories((prev) =>
        prev
          .map((c) =>
            c.id === id
              ? {
                  ...c,
                  name: data.category.name,
                  slug: data.category.slug,
                  heroSubheading: data.category.heroSubheading ?? "",
                  heroDescription: data.category.heroDescription ?? "",
                }
              : c
          )
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingId(null);
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSavingId(null);
    }
  }

  function toggleSeo(cat: ToolCategoryRow) {
    if (seoOpenId === cat.id) {
      setSeoOpenId(null);
      return;
    }
    setSeoOpenId(cat.id);
    setSeoDraft(cat.seo);
    setSeoError(null);
    setEditingId(null);
  }

  async function handleSaveSeo(cat: ToolCategoryRow) {
    setSavingSeoId(cat.id);
    setSeoError(null);
    try {
      const res = await fetch(`/api/seo/tool_category/${cat.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metaTitle: seoDraft.metaTitle || null,
          metaDescription: seoDraft.metaDescription || null,
          canonicalUrl: seoDraft.canonicalUrl || null,
          robotsIndex: seoDraft.robotsIndex,
          schemaType: seoDraft.schemaType || null,
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) {
        setSeoError(
          data?.error ?? `Could not save SEO settings — server error (${res.status}).`
        );
        return;
      }
      setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, seo: seoDraft } : c)));
      setSeoOpenId(null);
      router.refresh();
    } catch {
      setSeoError("Network error — please try again.");
    } finally {
      setSavingSeoId(null);
    }
  }

  async function handleDelete(cat: ToolCategoryRow) {
    const warning =
      cat.toolCount > 0
        ? `"${cat.name}" is used by ${cat.toolCount} tool${cat.toolCount === 1 ? "" : "s"}. Deleting it will leave ${cat.toolCount === 1 ? "that tool" : "those tools"} uncategorized. Delete anyway?`
        : `Delete the category "${cat.name}"?`;
    if (!window.confirm(warning)) return;

    setDeletingId(cat.id);
    setError(null);
    try {
      const res = await fetch(`/api/tool-categories/${cat.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not delete the category.");
        return;
      }
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <form
        onSubmit={handleCreate}
        className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
      >
        <input
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          placeholder="New category name, e.g. Finance Calculators"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button
          type="submit"
          disabled={creating || !newName.trim()}
          className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {creating ? "Adding..." : "+ Add Category"}
        </button>
      </form>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6 space-y-3">
        {categories.map((cat) => (
          <div key={cat.id}>
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-indigo-200 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-900">
              <CategoryIcon />

              {editingId === cat.id ? (
                <div className="min-w-0 flex-1 space-y-2">
                  <label className="block text-xs">
                    <span className="font-medium text-gray-500">Name</span>
                    <input
                      autoFocus
                      className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                  </label>
                  <label className="block text-xs">
                    <span className="font-medium text-gray-500">Hero Subheading</span>
                    <input
                      className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
                      placeholder="Short line under the headline"
                      value={editingHeroSubheading}
                      onChange={(e) => setEditingHeroSubheading(e.target.value)}
                    />
                  </label>
                  <label className="block text-xs">
                    <span className="font-medium text-gray-500">Hero Description</span>
                    <textarea
                      className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
                      rows={3}
                      placeholder="Longer paragraph shown under the subheading"
                      value={editingHeroDescription}
                      onChange={(e) => setEditingHeroDescription(e.target.value)}
                    />
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={savingId === cat.id}
                      onClick={() => handleRename(cat.id)}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {savingId === cat.id ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{cat.name}</p>
                    <p className="truncate text-xs text-gray-400">/tools/category/{cat.slug}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      cat.toolCount > 0
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                        : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    {cat.toolCount} tool{cat.toolCount === 1 ? "" : "s"}
                  </span>
                  <div className="flex w-full shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-gray-200 pl-12 text-sm sm:w-auto sm:border-l sm:pl-3 dark:border-gray-800">
                    <a
                      href={`/tools/category/${cat.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-gray-800 hover:underline dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      View
                    </a>
                    <button
                      type="button"
                      onClick={() => toggleSeo(cat)}
                      className={`hover:underline ${
                        seoOpenId === cat.id
                          ? "font-medium text-indigo-600 dark:text-indigo-400"
                          : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                      }`}
                    >
                      {seoOpenId === cat.id ? "Close SEO" : "SEO"}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEditing(cat)}
                      className="text-indigo-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === cat.id}
                      onClick={() => handleDelete(cat)}
                      className="text-red-600 hover:underline disabled:opacity-50"
                    >
                      {deletingId === cat.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </>
              )}
            </div>

            {seoOpenId === cat.id ? (
              <div className="mt-2 space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Meta Title
                  </label>
                  <input
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                    placeholder={`${cat.name} Calculators`}
                    value={seoDraft.metaTitle}
                    onChange={(e) => setSeoDraft((s) => ({ ...s, metaTitle: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Meta Description
                  </label>
                  <textarea
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                    value={seoDraft.metaDescription}
                    onChange={(e) =>
                      setSeoDraft((s) => ({ ...s, metaDescription: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                      Canonical URL
                    </label>
                    <input
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                      value={seoDraft.canonicalUrl}
                      onChange={(e) =>
                        setSeoDraft((s) => ({ ...s, canonicalUrl: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                      Schema.org Type
                    </label>
                    <input
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                      placeholder="CollectionPage"
                      value={seoDraft.schemaType}
                      onChange={(e) => setSeoDraft((s) => ({ ...s, schemaType: e.target.value }))}
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={seoDraft.robotsIndex}
                    onChange={(e) =>
                      setSeoDraft((s) => ({ ...s, robotsIndex: e.target.checked }))
                    }
                  />
                  Allow search engines to index this category page
                </label>

                {seoError ? <p className="text-sm text-red-600">{seoError}</p> : null}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={savingSeoId === cat.id}
                    onClick={() => handleSaveSeo(cat)}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {savingSeoId === cat.id ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSeoOpenId(null)}
                    className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ))}

        {categories.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-400 dark:border-gray-800">
            No categories yet — add your first one above.
          </p>
        ) : null}
      </div>
    </div>
  );
}
