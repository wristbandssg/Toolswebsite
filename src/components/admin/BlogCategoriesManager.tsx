"use client";

import { useRef, useState } from "react";
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
  // Sub-categories: null/undefined for a top-level category, otherwise the
  // id of the top-level category this one is filed under. Kept to a single
  // level deep — a sub-category can't itself have sub-categories.
  parentId: string | null;
  // Short intro shown at the top of the public category page, under the
  // title — separate from the SEO meta description below.
  description: string;
  seo: BlogCategorySeo;
}

const EMPTY_SEO: BlogCategorySeo = {
  metaTitle: "",
  metaDescription: "",
  canonicalUrl: "",
  robotsIndex: true,
  schemaType: "",
};

/** A small colored icon badge — folder for a top-level category, a "nested
 * under" arrow for a sub-category — so the hierarchy reads at a glance
 * instead of relying only on indentation and a plain dot. */
function CategoryIcon({ isChild }: { isChild: boolean }) {
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
        isChild
          ? "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400"
          : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
      }`}
    >
      {isChild ? (
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3v8a3 3 0 0 0 3 3h6M11 11l4 3-4 3" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path d="M3 5.5A1.5 1.5 0 0 1 4.5 4h3.379a1.5 1.5 0 0 1 1.06.44l1.122 1.12A1.5 1.5 0 0 0 11.12 6H15.5A1.5 1.5 0 0 1 17 7.5v7A1.5 1.5 0 0 1 15.5 16h-11A1.5 1.5 0 0 1 3 14.5v-9Z" />
        </svg>
      )}
    </span>
  );
}

/**
 * One category (or sub-category) row, plus its expandable SEO/intro panel.
 * Top-level rows and sub-category rows share this exact same component —
 * every category gets the same name/SEO/page-design feature set regardless
 * of nesting — the only differences are the indentation and the
 * "+ Sub-Category" quick action, which only makes sense on a top-level row.
 */
function CategoryRow({
  cat,
  isChild,
  editingId,
  editingName,
  setEditingName,
  savingId,
  startEditing,
  handleRename,
  setEditingId,
  seoOpenId,
  toggleSeo,
  seoDraft,
  setSeoDraft,
  descriptionDraft,
  setDescriptionDraft,
  savingSeoId,
  seoError,
  handleSaveSeo,
  setSeoOpenId,
  deletingId,
  handleDelete,
  onAddSubcategory,
}: {
  cat: BlogCategoryRow;
  isChild: boolean;
  editingId: string | null;
  editingName: string;
  setEditingName: (v: string) => void;
  savingId: string | null;
  startEditing: (cat: BlogCategoryRow) => void;
  handleRename: (id: string) => void;
  setEditingId: (id: string | null) => void;
  seoOpenId: string | null;
  toggleSeo: (cat: BlogCategoryRow) => void;
  seoDraft: BlogCategorySeo;
  setSeoDraft: React.Dispatch<React.SetStateAction<BlogCategorySeo>>;
  descriptionDraft: string;
  setDescriptionDraft: (v: string) => void;
  savingSeoId: string | null;
  seoError: string | null;
  handleSaveSeo: (cat: BlogCategoryRow) => void;
  setSeoOpenId: (id: string | null) => void;
  deletingId: string | null;
  handleDelete: (cat: BlogCategoryRow) => void;
  onAddSubcategory?: (cat: BlogCategoryRow) => void;
}) {
  return (
    <div className={isChild ? "ml-6 sm:ml-10" : undefined}>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-indigo-200 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-900">
        <CategoryIcon isChild={isChild} />

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
              <p className="truncate font-medium">{cat.name}</p>
              <p className="truncate text-xs text-gray-400">/blog/category/{cat.slug}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                cat.postCount > 0
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {cat.postCount} post{cat.postCount === 1 ? "" : "s"}
            </span>
            <div className="flex w-full shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-gray-200 pl-12 text-sm sm:w-auto sm:border-l sm:pl-3 dark:border-gray-800">
              <a
                href={`/blog/category/${cat.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-gray-800 hover:underline dark:text-gray-400 dark:hover:text-gray-200"
              >
                View
              </a>
              {!isChild && onAddSubcategory ? (
                <button
                  type="button"
                  onClick={() => onAddSubcategory(cat)}
                  className="text-gray-500 hover:text-gray-800 hover:underline dark:text-gray-400 dark:hover:text-gray-200"
                >
                  + Sub-Category
                </button>
              ) : null}
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
                Rename
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
              Category Page Intro (shown on the public page, under the title)
            </label>
            <textarea
              rows={4}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              placeholder={`A short intro for the "${cat.name}" category page — around 100–150 words.`}
              value={descriptionDraft}
              onChange={(e) => setDescriptionDraft(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-400">
              {descriptionDraft.trim() ? descriptionDraft.trim().split(/\s+/).length : 0} words
              (aim for 100–150)
            </p>
          </div>

          <div className="border-t border-gray-200 pt-3 dark:border-gray-800">
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
  );
}

export default function BlogCategoriesManager({ initial }: { initial: BlogCategoryRow[] }) {
  const router = useRouter();
  const [categories, setCategories] = useState<BlogCategoryRow[]>(initial);
  const [newName, setNewName] = useState("");
  // Empty string = new category will be top-level; otherwise the id of the
  // top-level category it becomes a sub-category of.
  const [newParentId, setNewParentId] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [seoOpenId, setSeoOpenId] = useState<string | null>(null);
  const [seoDraft, setSeoDraft] = useState<BlogCategorySeo>(EMPTY_SEO);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [savingSeoId, setSavingSeoId] = useState<string | null>(null);
  const [seoError, setSeoError] = useState<string | null>(null);

  const topLevelCategories = categories.filter((c) => !c.parentId);
  const childrenByParentId = new Map<string, BlogCategoryRow[]>();
  for (const c of categories) {
    if (!c.parentId) continue;
    const siblings = childrenByParentId.get(c.parentId) ?? [];
    siblings.push(c);
    childrenByParentId.set(c.parentId, siblings);
  }

  function toggleSeo(cat: BlogCategoryRow) {
    if (seoOpenId === cat.id) {
      setSeoOpenId(null);
      return;
    }
    setSeoOpenId(cat.id);
    setSeoDraft(cat.seo);
    setDescriptionDraft(cat.description);
    setSeoError(null);
  }

  function startAddSubcategory(cat: BlogCategoryRow) {
    setNewParentId(cat.id);
    nameInputRef.current?.focus();
    nameInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // Reads a Response body as JSON without throwing — a 500 from a stale
  // Prisma Client (schema field not yet pushed to the DB) comes back as an
  // HTML error page, not JSON, and `.json()` on that would throw and get
  // swallowed by a single shared catch below, masking which of the two
  // saves actually failed. Returning null here instead lets the caller
  // build a specific, honest error message from the status code.
  async function safeJson(res: Response): Promise<{ error?: string } | null> {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  async function handleSaveSeo(cat: BlogCategoryRow) {
    setSavingSeoId(cat.id);
    setSeoError(null);

    // Promise.allSettled (not Promise.all) so a failure in one request can
    // never hide the outcome of the other — each of the two independent
    // saves (SEO meta fields, and the category's name+description) reports
    // its own success/failure separately below.
    const [seoOutcome, descOutcome] = await Promise.allSettled([
      fetch(`/api/seo/category/${cat.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metaTitle: seoDraft.metaTitle || null,
          metaDescription: seoDraft.metaDescription || null,
          canonicalUrl: seoDraft.canonicalUrl || null,
          robotsIndex: seoDraft.robotsIndex,
          schemaType: seoDraft.schemaType || null,
        }),
      }),
      // The intro paragraph lives on the category itself, not on SeoMeta —
      // the rename endpoint doubles as "update category fields", so the
      // current name is resent unchanged alongside the new description.
      fetch(`/api/blog-categories/${cat.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cat.name, description: descriptionDraft }),
      }),
    ]);

    const errors: string[] = [];
    let seoOk = false;
    let descOk = false;

    if (seoOutcome.status === "fulfilled") {
      const res = seoOutcome.value;
      const data = await safeJson(res);
      if (res.ok) {
        seoOk = true;
      } else {
        errors.push(`SEO fields: ${data?.error ?? `server error (${res.status}) — the database may need the latest schema pushed`}`);
      }
    } else {
      errors.push("SEO fields: could not reach the server.");
    }

    if (descOutcome.status === "fulfilled") {
      const res = descOutcome.value;
      const data = await safeJson(res);
      if (res.ok) {
        descOk = true;
      } else {
        errors.push(`Page intro: ${data?.error ?? `server error (${res.status})`}`);
      }
    } else {
      errors.push("Page intro: could not reach the server.");
    }

    if (seoOk || descOk) {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === cat.id
            ? {
                ...c,
                seo: seoOk ? seoDraft : c.seo,
                description: descOk ? descriptionDraft : c.description,
              }
            : c
        )
      );
    }

    if (errors.length > 0) {
      setSeoError(errors.join("  •  "));
    } else {
      setSeoOpenId(null);
    }
    router.refresh();
    setSavingSeoId(null);
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
        body: JSON.stringify({ name: newName.trim(), parentId: newParentId || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create the category.");
        return;
      }
      setCategories((prev) =>
        [...prev, { ...data.category, description: "", seo: EMPTY_SEO } as BlogCategoryRow].sort(
          (a, b) => a.name.localeCompare(b.name)
        )
      );
      setNewName("");
      // Deliberately NOT resetting newParentId — it's common to add several
      // sub-categories under the same parent back to back.
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
    const childCount = childrenByParentId.get(cat.id)?.length ?? 0;
    const parts: string[] = [];
    if (cat.postCount > 0) {
      parts.push(
        `leave ${cat.postCount === 1 ? "that post" : `those ${cat.postCount} posts`} uncategorized`
      );
    }
    if (childCount > 0) {
      parts.push(
        `turn ${childCount === 1 ? "its sub-category" : `its ${childCount} sub-categories`} into top-level categories`
      );
    }
    const warning =
      parts.length > 0
        ? `Deleting "${cat.name}" will ${parts.join(" and ")}. Delete anyway?`
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
      setCategories((prev) =>
        prev
          .filter((c) => c.id !== cat.id)
          .map((c) => (c.parentId === cat.id ? { ...c, parentId: null } : c))
      );
      if (newParentId === cat.id) setNewParentId("");
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  const selectedParentName = topLevelCategories.find((c) => c.id === newParentId)?.name;

  return (
    <div className="w-full">
      <form
        onSubmit={handleCreate}
        className="rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/50 p-5 dark:border-indigo-800 dark:bg-indigo-950/20"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            ref={nameInputRef}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            placeholder={
              newParentId ? "New sub-category name, e.g. Calculator Tools" : "New category name, e.g. Budgeting Tips"
            }
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <select
            className="shrink-0 rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            value={newParentId}
            onChange={(e) => setNewParentId(e.target.value)}
            title="Make this a sub-category of..."
          >
            <option value="">-- Top-Level Category --</option>
            {topLevelCategories.map((c) => (
              <option key={c.id} value={c.id}>
                Sub-category of: {c.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {creating ? "Adding..." : newParentId ? "+ Add Sub-Category" : "+ Add Category"}
          </button>
        </div>
        {newParentId && selectedParentName ? (
          <p className="mt-2 text-xs text-gray-500">
            This will be added under <span className="font-medium">{selectedParentName}</span>.{" "}
            <button
              type="button"
              onClick={() => setNewParentId("")}
              className="text-indigo-600 hover:underline"
            >
              Make it top-level instead
            </button>
          </p>
        ) : null}
      </form>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6 space-y-2">
        {topLevelCategories.map((cat) => (
          <div key={cat.id} className="space-y-2">
            <CategoryRow
              cat={cat}
              isChild={false}
              editingId={editingId}
              editingName={editingName}
              setEditingName={setEditingName}
              savingId={savingId}
              startEditing={startEditing}
              handleRename={handleRename}
              setEditingId={setEditingId}
              seoOpenId={seoOpenId}
              toggleSeo={toggleSeo}
              seoDraft={seoDraft}
              setSeoDraft={setSeoDraft}
              descriptionDraft={descriptionDraft}
              setDescriptionDraft={setDescriptionDraft}
              savingSeoId={savingSeoId}
              seoError={seoError}
              handleSaveSeo={handleSaveSeo}
              setSeoOpenId={setSeoOpenId}
              deletingId={deletingId}
              handleDelete={handleDelete}
              onAddSubcategory={startAddSubcategory}
            />
            {(childrenByParentId.get(cat.id) ?? []).map((child) => (
              <CategoryRow
                key={child.id}
                cat={child}
                isChild
                editingId={editingId}
                editingName={editingName}
                setEditingName={setEditingName}
                savingId={savingId}
                startEditing={startEditing}
                handleRename={handleRename}
                setEditingId={setEditingId}
                seoOpenId={seoOpenId}
                toggleSeo={toggleSeo}
                seoDraft={seoDraft}
                setSeoDraft={setSeoDraft}
                descriptionDraft={descriptionDraft}
                setDescriptionDraft={setDescriptionDraft}
                savingSeoId={savingSeoId}
                seoError={seoError}
                handleSaveSeo={handleSaveSeo}
                setSeoOpenId={setSeoOpenId}
                deletingId={deletingId}
                handleDelete={handleDelete}
              />
            ))}
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
