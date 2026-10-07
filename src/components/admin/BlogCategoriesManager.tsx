"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { blogCategoryUrl } from "@/lib/urls";

// Blog Categories manager — the same look and workflow as the Calculator
// Categories manager (ToolCategoriesManager): a collapsible tree, count
// pills, View / + Sub-Category / Content / SEO / Edit / Delete on every row,
// an Edit form and an inline SEO panel. Blog categories nest one level deep.

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
  // null for a top-level category, otherwise the id of the top-level
  // category it is filed under (one level deep only).
  parentId: string | null;
  // Short intro shown at the top of the public category page, under the title.
  description: string;
  postCount: number;
  // Of postCount, how many are published — the rest show as "draft".
  publishedCount: number;
  seo: BlogCategorySeo;
}

const EMPTY_SEO: BlogCategorySeo = {
  metaTitle: "",
  metaDescription: "",
  canonicalUrl: "",
  robotsIndex: true,
  schemaType: "",
};

const linkButton = "text-gray-500 hover:text-gray-800 hover:underline dark:text-gray-400 dark:hover:text-gray-200";
const fieldClass = "mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800";
const seoFieldClass = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800";

function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/** Folder badge for a top-level category, a "nested under" arrow for a sub-category. */
function CategoryIcon({ isNested }: { isNested: boolean }) {
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
        isNested
          ? "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400"
          : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
      }`}
    >
      {isNested ? (
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3v8a3 3 0 0 0 3 3h6M11 11l4 3-4 3" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 3.5h7l3 3v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-12a1 1 0 0 1 1-1Z" />
          <path d="M7 9h6M7 12h6M7 15h4" />
        </svg>
      )}
    </span>
  );
}

/** total / published / draft post counts. */
function PostCountPills({ postCount, publishedCount }: { postCount: number; publishedCount: number }) {
  return (
    <div className="flex shrink-0 items-center gap-1.5 text-xs">
      <span className="rounded-full bg-indigo-50 px-2 py-1 font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
        {postCount} total
      </span>
      <span className="rounded-full bg-emerald-50 px-2 py-1 font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
        {publishedCount} published
      </span>
      <span className="rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
        {postCount - publishedCount} draft
      </span>
    </div>
  );
}

interface EditDraft {
  name: string;
  slug: string;
  description: string;
  parentId: string; // "" = top-level
}

export default function BlogCategoriesManager({ initial }: { initial: BlogCategoryRow[] }) {
  const router = useRouter();
  const [categories, setCategories] = useState<BlogCategoryRow[]>(initial);
  const [error, setError] = useState<string | null>(null);

  // Add form
  const [newName, setNewName] = useState("");
  const [newParentId, setNewParentId] = useState(""); // "" = top-level
  const [creating, setCreating] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Edit form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditDraft>({ name: "", slug: "", description: "", parentId: "" });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // SEO panel
  const [seoOpenId, setSeoOpenId] = useState<string | null>(null);
  const [seoDraft, setSeoDraft] = useState<BlogCategorySeo>(EMPTY_SEO);
  const [savingSeoId, setSavingSeoId] = useState<string | null>(null);
  const [seoError, setSeoError] = useState<string | null>(null);

  // Top-level categories start collapsed; a click shows their sub-categories.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const toggleExpand = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const expand = (id: string) => setExpandedIds((prev) => new Set(prev).add(id));

  const topLevel = categories.filter((c) => !c.parentId);
  const childrenOf = (id: string) => categories.filter((c) => c.parentId === id);
  const sortByName = (list: BlogCategoryRow[]) => [...list].sort((a, b) => a.name.localeCompare(b.name));

  // A server error page isn't JSON — don't let .json() throw on it.
  async function safeJson(res: Response): Promise<{ error?: string; category?: Record<string, unknown> } | null> {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  function startAddSubcategory(cat: BlogCategoryRow) {
    setNewParentId(cat.id);
    expand(cat.id);
    nameInputRef.current?.focus();
    nameInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
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
      const data = await safeJson(res);
      if (!res.ok || !data?.category) {
        setError(data?.error ?? "Could not create the category.");
        return;
      }
      const created = data.category as { id: string; name: string; slug: string; parentId?: string | null };
      setCategories((prev) =>
        sortByName([
          ...prev,
          {
            id: created.id,
            name: created.name,
            slug: created.slug,
            parentId: created.parentId ?? null,
            description: "",
            postCount: 0,
            publishedCount: 0,
            seo: EMPTY_SEO,
          },
        ])
      );
      if (created.parentId) expand(created.parentId);
      setNewName("");
      // newParentId is kept — several sub-categories are often added in a row.
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setCreating(false);
    }
  }

  function startEditing(cat: BlogCategoryRow) {
    setEditingId(cat.id);
    setDraft({ name: cat.name, slug: cat.slug, description: cat.description, parentId: cat.parentId ?? "" });
    setSeoOpenId(null);
    setError(null);
  }

  async function handleSave(cat: BlogCategoryRow) {
    if (!draft.name.trim()) return;
    setSavingId(cat.id);
    setError(null);
    try {
      const res = await fetch(`/api/blog-categories/${cat.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          slug: draft.slug.trim(),
          description: draft.description.trim(),
          parentId: draft.parentId || null,
        }),
      });
      const data = await safeJson(res);
      if (!res.ok || !data?.category) {
        setError(data?.error ?? `Could not save the category (${res.status}).`);
        return;
      }
      const saved = data.category as { name: string; slug: string; description?: string | null; parentId?: string | null };
      setCategories((prev) =>
        sortByName(
          prev.map((c) =>
            c.id === cat.id
              ? { ...c, name: saved.name, slug: saved.slug, description: saved.description ?? "", parentId: saved.parentId ?? null }
              : c
          )
        )
      );
      if (saved.parentId) expand(saved.parentId);
      setEditingId(null);
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSavingId(null);
    }
  }

  function toggleSeo(cat: BlogCategoryRow) {
    if (seoOpenId === cat.id) {
      setSeoOpenId(null);
      return;
    }
    setSeoOpenId(cat.id);
    setSeoDraft(cat.seo);
    setSeoError(null);
    setEditingId(null);
  }

  async function handleSaveSeo(cat: BlogCategoryRow) {
    setSavingSeoId(cat.id);
    setSeoError(null);
    try {
      const res = await fetch(`/api/seo/category/${cat.id}`, {
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
        setSeoError(data?.error ?? `Could not save SEO settings — server error (${res.status}).`);
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

  async function handleDelete(cat: BlogCategoryRow) {
    const childCount = childrenOf(cat.id).length;
    const parts: string[] = [];
    if (cat.postCount > 0) {
      parts.push(`remove it from ${cat.postCount === 1 ? "1 post" : `${cat.postCount} posts`}`);
    }
    if (childCount > 0) {
      parts.push(`turn ${childCount === 1 ? "its sub-category" : `its ${childCount} sub-categories`} into top-level categories`);
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
      const data = await safeJson(res);
      if (!res.ok) {
        setError(data?.error ?? "Could not delete the category.");
        return;
      }
      setCategories((prev) =>
        prev.filter((c) => c.id !== cat.id).map((c) => (c.parentId === cat.id ? { ...c, parentId: null } : c))
      );
      if (newParentId === cat.id) setNewParentId("");
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  function renderRow(cat: BlogCategoryRow, isNested: boolean) {
    const children = isNested ? [] : childrenOf(cat.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(cat.id);
    const editing = editingId === cat.id;
    const href = blogCategoryUrl(cat.slug);
    // Possible parents: other top-level categories. A category that has its
    // own sub-categories must stay top-level (one level deep).
    const parentOptions = hasChildren ? [] : topLevel.filter((c) => c.id !== cat.id);

    return (
      <div key={cat.id} className="space-y-2">
        <div className={isNested ? "ml-7" : undefined}>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-indigo-200 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-900">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpand(cat.id)}
                aria-label={isExpanded ? "Collapse sub-categories" : "Expand sub-categories"}
                aria-expanded={isExpanded}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M7 4l6 6-6 6" />
                </svg>
              </button>
            ) : (
              <span className="h-5 w-5 shrink-0" aria-hidden />
            )}
            <CategoryIcon isNested={isNested} />

            {editing ? (
              <div className="min-w-0 flex-1 space-y-2">
                <label className="block text-xs">
                  <span className="font-medium text-gray-500">Name</span>
                  <input
                    autoFocus
                    className={fieldClass}
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                </label>
                <label className="block text-xs">
                  <span className="font-medium text-gray-500">URL Slug</span>
                  <input
                    className={`${fieldClass} font-mono`}
                    placeholder="e.g. personal-finance"
                    value={draft.slug}
                    onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-") }))}
                  />
                  <span className="mt-1 block text-gray-400">
                    Now: <span className="font-mono">{href}</span>
                    {draft.slug.trim() && draft.slug.trim() !== cat.slug
                      ? " — the old URL will 301-redirect to the new one."
                      : ""}
                  </span>
                </label>
                <label className="block text-xs">
                  <span className="font-medium text-gray-500">Page Intro</span>
                  <textarea
                    className={fieldClass}
                    rows={4}
                    placeholder={`A short intro shown under the title on the "${cat.name}" page — around 100–150 words.`}
                    value={draft.description}
                    onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                  />
                  <span className="mt-1 block text-gray-400">{countWords(draft.description)} words (aim for 100–150)</span>
                </label>
                <label className="block text-xs">
                  <span className="font-medium text-gray-500">Parent Category</span>
                  <select
                    className={`${fieldClass} bg-white`}
                    value={draft.parentId}
                    disabled={hasChildren}
                    onChange={(e) => setDraft((d) => ({ ...d, parentId: e.target.value }))}
                  >
                    <option value="">-- Top-Level Category --</option>
                    {parentOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                  {hasChildren ? (
                    <span className="mt-1 block text-gray-400">
                      Has {children.length} sub-categor{children.length === 1 ? "y" : "ies"}, so it stays top-level
                      (blog categories are one level deep).
                    </span>
                  ) : null}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={savingId === cat.id}
                    onClick={() => handleSave(cat)}
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
                <div className="min-w-[12rem] flex-1">
                  <p className="font-medium [overflow-wrap:anywhere]">
                    {cat.name}
                    {hasChildren && !isExpanded ? (
                      <span className="ml-2 font-normal text-gray-400">
                        ({children.length} sub-categor{children.length === 1 ? "y" : "ies"} hidden)
                      </span>
                    ) : null}
                  </p>
                </div>
                <PostCountPills postCount={cat.postCount} publishedCount={cat.publishedCount} />
                <div className="ml-auto flex w-full shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-gray-200 pl-12 text-sm sm:w-auto sm:border-l sm:pl-3 dark:border-gray-800">
                  <a href={href} target="_blank" rel="noopener noreferrer" className={linkButton}>
                    View
                  </a>
                  {!isNested ? (
                    <button type="button" onClick={() => startAddSubcategory(cat)} className={linkButton}>
                      + Sub-Category
                    </button>
                  ) : null}
                  <a href={`/admin/blogs/categories/${cat.id}/content`} className={linkButton}>
                    Content
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
                  <button type="button" onClick={() => startEditing(cat)} className="text-indigo-600 hover:underline">
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
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">Meta Title</label>
                <input
                  className={seoFieldClass}
                  placeholder={`${cat.name} — Blog`}
                  value={seoDraft.metaTitle}
                  onChange={(e) => setSeoDraft((s) => ({ ...s, metaTitle: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">Meta Description</label>
                <textarea
                  rows={2}
                  className={seoFieldClass}
                  value={seoDraft.metaDescription}
                  onChange={(e) => setSeoDraft((s) => ({ ...s, metaDescription: e.target.value }))}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">Canonical URL</label>
                  <input
                    className={seoFieldClass}
                    value={seoDraft.canonicalUrl}
                    onChange={(e) => setSeoDraft((s) => ({ ...s, canonicalUrl: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">Schema.org Type</label>
                  <input
                    className={seoFieldClass}
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

        {hasChildren && isExpanded ? children.map((child) => renderRow(child, true)) : null}
      </div>
    );
  }

  const selectedParentName = topLevel.find((c) => c.id === newParentId)?.name;

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
            placeholder={newParentId ? "New sub-category name, e.g. Budgeting Tips" : "New category name, e.g. Personal Finance"}
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
            {topLevel.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
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
            <button type="button" onClick={() => setNewParentId("")} className="text-indigo-600 hover:underline">
              Make it top-level instead
            </button>
          </p>
        ) : null}
      </form>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6 space-y-2">
        {topLevel.map((cat) => renderRow(cat, false))}

        {categories.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400 dark:border-gray-800">
            No categories yet — add your first one above.
          </p>
        ) : null}
      </div>
    </div>
  );
}
