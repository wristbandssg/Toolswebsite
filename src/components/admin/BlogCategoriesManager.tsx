"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface BlogCategorySeo {
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  robotsIndex: boolean;
  schemaType: string;
}

export interface BlogCategoryRow {
  id: string;
  name: string;
  slug: string;
  postCount: number;
  seo: BlogCategorySeo;
}

const EMPTY_SEO: BlogCategorySeo = {
  metaTitle: "",
  metaDescription: "",
  canonicalUrl: "",
  robotsIndex: true,
  schemaType: "",
};

export default function BlogCategoriesManager({ initial }: { initial: BlogCategoryRow[] }) {
  const router = useRouter();
  const [categories, setCategories] = useState<BlogCategoryRow[]>(initial);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [seoOpenId, setSeoOpenId] = useState<string | null>(null);
  const [seoDraft, setSeoDraft] = useState<BlogCategorySeo>(EMPTY_SEO);
  const [savingSeoId, setSavingSeoId] = useState<string | null>(null);
  const [seoError, setSeoError] = useState<string | null>(null);

  function toggleSeo(cat: BlogCategoryRow) {
    if (seoOpenId === cat.id) {
      setSeoOpenId(null);
      return;
    }
    setSeoOpenId(cat.id);
    setSeoDraft(cat.seo);
    setSeoError(null);
  }

  async function handleSaveSeo(id: string) {
    setSavingSeoId(id);
    setSeoError(null);
    try {
      const res = await fetch(`/api/seo/category/${id}`, {
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
      const data = await res.json();
      if (!res.ok) {
        setSeoError(data.error ?? "Could not save the SEO settings.");
        return;
      }
      setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, seo: seoDraft } : c)));
      setSeoOpenId(null);
      router.refresh();
    } catch {
      setSeoError("Network error — please try again.");
    } finally {
      setSavingSeoId(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/blog-categories", {
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
        [...prev, { ...data.category, seo: EMPTY_SEO } as BlogCategoryRow].sort((a, b) =>
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

  function startEditing(cat: BlogCategoryRow) {
    setEditingId(cat.id);
    setEditingName(cat.name);
    setError(null);
  }

  async function handleRename(id: string) {
    if (!editingName.trim()) return;
    setSavingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/blog-categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not rename the category.");
        return;
      }
      setCategories((prev) =>
        prev
          .map((c) => (c.id === id ? { ...c, name: data.category.name, slug: data.category.slug } : c))
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

  async function handleDelete(cat: BlogCategoryRow) {
    const warning =
      cat.postCount > 0
        ? `"${cat.name}" is used by ${cat.postCount} post${cat.postCount === 1 ? "" : "s"}. Deleting it will leave ${cat.postCount === 1 ? "that post" : "those posts"} uncategorized. Delete anyway?`
        : `Delete the category "${cat.name}"?`;
    if (!window.confirm(warning)) return;

    setDeletingId(cat.id);
    setError(null);
    try {
      const res = await fetch(`/api/blog-categories/${cat.id}`, { method: "DELETE" });
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
    <div className="max-w-3xl">
      <form
        onSubmit={handleCreate}
        className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/50 p-5 dark:border-indigo-800 dark:bg-indigo-950/20"
      >
        <input
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          placeholder="New category name, e.g. Budgeting Tips"
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

      <div className="mt-6 space-y-2">
        {categories.map((cat) => (
          <div key={cat.id}>
          <div
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
          >
            <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-500" />

            {editingId === cat.id ? (
              <div className="flex flex-1 items-center gap-2">
                <input
                  autoFocus
                  className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename(cat.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                />
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
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{cat.name}</p>
                  <p className="text-xs text-gray-400">/blog/category/{cat.slug}</p>
                </div>
                <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {cat.postCount} post{cat.postCount === 1 ? "" : "s"}
                </span>
                <button
                  type="button"
                  onClick={() => toggleSeo(cat)}
                  className="shrink-0 text-sm text-gray-600 hover:underline dark:text-gray-300"
                >
                  {seoOpenId === cat.id ? "Close SEO" : "SEO"}
                </button>
                <button
                  type="button"
                  onClick={() => startEditing(cat)}
                  className="shrink-0 text-sm text-indigo-600 hover:underline"
                >
                  Rename
                </button>
                <button
                  type="button"
                  disabled={deletingId === cat.id}
                  onClick={() => handleDelete(cat)}
                  className="shrink-0 text-sm text-red-600 hover:underline disabled:opacity-50"
                >
                  {deletingId === cat.id ? "Deleting..." : "Delete"}
                </button>
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
                  placeholder={`${cat.name} — Blog`}
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
                  onChange={(e) => setSeoDraft((s) => ({ ...s, metaDescription: e.target.value }))}
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
                    onChange={(e) => setSeoDraft((s) => ({ ...s, canonicalUrl: e.target.value }))}
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
                  onChange={(e) => setSeoDraft((s) => ({ ...s, robotsIndex: e.target.checked }))}
                />
                Allow search engines to index this category page
              </label>

              {seoError ? <p className="text-sm text-red-600">{seoError}</p> : null}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={savingSeoId === cat.id}
                  onClick={() => handleSaveSeo(cat.id)}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {savingSeoId === cat.id ? "Saving..." : "Save SEO"}
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
          <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400 dark:border-gray-800">
            No categories yet — add your first one above.
          </p>
        ) : null}
      </div>
    </div>
  );
}
