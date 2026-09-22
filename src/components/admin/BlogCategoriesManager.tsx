"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface BlogCategoryRow {
  id: string;
  name: string;
  slug: string;
  postCount: number;
}

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
        [...prev, data.category as BlogCategoryRow].sort((a, b) => a.name.localeCompare(b.name))
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
          <div
            key={cat.id}
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
