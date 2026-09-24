"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
}

// A small fixed palette, picked deterministically per category so the grid
// reads as a colorful catalog rather than a plain list (kept visually
// distinct from the Blog Categories manager's design).
const SWATCHES = [
  "bg-rose-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-fuchsia-500",
  "bg-cyan-500",
  "bg-orange-500",
];

function swatchFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return SWATCHES[hash % SWATCHES.length];
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
        [...prev, data.category as ToolCategoryRow].sort((a, b) => a.name.localeCompare(b.name))
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
          className="shrink-0 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
        >
          {creating ? "Adding..." : "+ Add Category"}
        </button>
      </form>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
          >
            <div className={`h-1.5 ${swatchFor(cat.name)}`} />
            <div className="p-4">
              {editingId === cat.id ? (
                <div className="space-y-2">
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
                      className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-white dark:text-gray-900"
                    >
                      {savingId === cat.id ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{cat.name}</p>
                      <p className="truncate text-xs text-gray-400">/tools/category/{cat.slug}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium text-white ${swatchFor(cat.name)}`}
                    >
                      {cat.toolCount}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-4 border-t border-gray-100 pt-3 text-xs dark:border-gray-800">
                    <button
                      type="button"
                      onClick={() => startEditing(cat)}
                      className="font-medium text-gray-600 hover:underline dark:text-gray-300"
                    >
                      Edit
                    </button>
                    <Link
                      href={`/admin/seo/tool_category/${cat.id}`}
                      target="_blank"
                      className="font-medium text-gray-600 hover:underline dark:text-gray-300"
                    >
                      SEO →
                    </Link>
                    <button
                      type="button"
                      disabled={deletingId === cat.id}
                      onClick={() => handleDelete(cat)}
                      className="font-medium text-red-600 hover:underline disabled:opacity-50"
                    >
                      {deletingId === cat.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}

        {categories.length === 0 ? (
          <p className="col-span-full rounded-2xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-400 dark:border-gray-800">
            No categories yet — add your first one above.
          </p>
        ) : null}
      </div>
    </div>
  );
}
