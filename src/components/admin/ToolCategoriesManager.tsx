"use client";

import { useRef, useState } from "react";
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
  // Sub-categories: null/undefined for a top-level category, otherwise the
  // id of the category this one is filed under. Arbitrary depth is
  // supported — a sub-category can itself have sub-categories (e.g.
  // Finance Calculators -> Tax Calculators -> Pakistan Tax & Salary
  // Calculators -> a tool) — see the ToolCategory.parentId comment in
  // schema.prisma for how cycles are prevented.
  parentId: string | null;
  // Hero section content for this category's public /tools/category/[slug]
  // page (see the page component) — both blank until the admin fills them
  // in below; the public page generates fallback copy until then.
  heroSubheading: string;
  heroDescription: string;
  toolCount: number;
  // Of toolCount, how many are status "published" — the rest (draft,
  // in_review, needs_update) are shown together as "draft" since that's
  // the distinction that matters day to day: is it live or not.
  publishedCount: number;
  seo: ToolCategorySeo;
}

/** A flattened, tree-ordered option for the "Parent Category" selects — a
 * parent always appears immediately before its own children, and `depth`
 * drives the indentation prefix so the hierarchy reads at a glance in a
 * plain <select> (which can't reliably render CSS indentation per-option
 * across browsers, so a text prefix is what actually shows up). */
interface ParentOption {
  id: string;
  name: string;
  depth: number;
}

const EMPTY_SEO: ToolCategorySeo = {
  metaTitle: "",
  metaDescription: "",
  canonicalUrl: "",
  robotsIndex: true,
  schemaType: "",
};

/** Builds parentId -> sorted children lookup once per render. Categories
 * are kept globally name-sorted by every mutation below, so children come
 * out already alphabetical without a second sort here. */
function buildChildrenMap(categories: ToolCategoryRow[]): Map<string, ToolCategoryRow[]> {
  const map = new Map<string, ToolCategoryRow[]>();
  for (const c of categories) {
    if (!c.parentId) continue;
    const siblings = map.get(c.parentId) ?? [];
    siblings.push(c);
    map.set(c.parentId, siblings);
  }
  return map;
}

/** Every id nested anywhere under `id` (children, grandchildren, ...) — used
 * to keep a category out of its own "Parent Category" options, since
 * choosing one of its descendants as its parent would create a loop (the
 * API rejects this too, but filtering it out of the dropdown means the
 * admin never sees an option that would just bounce back as an error). */
function getDescendantIds(id: string, childrenByParentId: Map<string, ToolCategoryRow[]>): Set<string> {
  const result = new Set<string>();
  const stack = [...(childrenByParentId.get(id) ?? [])];
  while (stack.length) {
    const c = stack.pop()!;
    if (result.has(c.id)) continue;
    result.add(c.id);
    stack.push(...(childrenByParentId.get(c.id) ?? []));
  }
  return result;
}

/** Flattens the whole tree, parent-then-children, with a depth for each
 * entry — the source list for every "Parent Category" dropdown. */
function flattenTree(
  topLevelCategories: ToolCategoryRow[],
  childrenByParentId: Map<string, ToolCategoryRow[]>
): ParentOption[] {
  const out: ParentOption[] = [];
  function walk(list: ToolCategoryRow[], depth: number) {
    for (const c of list) {
      out.push({ id: c.id, name: c.name, depth });
      walk(childrenByParentId.get(c.id) ?? [], depth + 1);
    }
  }
  walk(topLevelCategories, 0);
  return out;
}

/** A small colored icon badge — folder for a top-level category, a "nested
 * under" arrow for anything filed under another one — so the hierarchy
 * reads at a glance, matching the Blog Categories manager's visual
 * language. Every depth below the root gets the same nested icon. */
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
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className="h-4 w-4"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 3v8a3 3 0 0 0 3 3h6M11 11l4 3-4 3" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="2.5" width="12" height="15" rx="1.5" />
          <path d="M7 6h6M7 9.5h.01M10 9.5h.01M13 9.5h.01M7 12.5h.01M10 12.5h.01M13 12.5h.01" />
        </svg>
      )}
    </span>
  );
}

/** A compact cluster of count pills — total / published / draft — replacing
 * the single "N tools" pill so the published-vs-draft split is visible
 * without opening every tool. */
function ToolCountPills({ toolCount, publishedCount }: { toolCount: number; publishedCount: number }) {
  const draftCount = toolCount - publishedCount;
  return (
    <div className="flex shrink-0 items-center gap-1.5 text-xs">
      <span className="rounded-full bg-indigo-50 px-2 py-1 font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
        {toolCount} total
      </span>
      <span className="rounded-full bg-emerald-50 px-2 py-1 font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
        {publishedCount} published
      </span>
      <span className="rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
        {draftCount} draft
      </span>
    </div>
  );
}

/**
 * One category row, at any depth, plus its expandable Edit/SEO panels.
 * Every row shares this exact same component — every category gets the
 * same hero/SEO/sub-category feature set regardless of nesting — the only
 * difference is the indentation, which scales with `depth`.
 */
function CategoryRow({
  cat,
  depth,
  editingId,
  editingName,
  setEditingName,
  editingHeroSubheading,
  setEditingHeroSubheading,
  editingHeroDescription,
  setEditingHeroDescription,
  editingParentId,
  setEditingParentId,
  parentOptions,
  childCount,
  savingId,
  startEditing,
  handleRename,
  setEditingId,
  seoOpenId,
  toggleSeo,
  seoDraft,
  setSeoDraft,
  savingSeoId,
  seoError,
  handleSaveSeo,
  setSeoOpenId,
  deletingId,
  handleDelete,
  onAddSubcategory,
}: {
  cat: ToolCategoryRow;
  depth: number;
  editingId: string | null;
  editingName: string;
  setEditingName: (v: string) => void;
  editingHeroSubheading: string;
  setEditingHeroSubheading: (v: string) => void;
  editingHeroDescription: string;
  setEditingHeroDescription: (v: string) => void;
  // "" means top-level; otherwise the id of the category this one is being
  // filed under. Editable on every row at any depth, so an existing
  // category can be turned into a sub-category, moved to a different
  // parent, or promoted back to top-level — the gap the admin couldn't
  // previously fill in from here at all.
  editingParentId: string;
  setEditingParentId: (v: string) => void;
  // Every category `cat` could be filed under — the full tree minus `cat`
  // itself and its own descendants (picking one of those would create a
  // loop) — only meaningful while editingId === cat.id.
  parentOptions: ParentOption[];
  // How many other categories currently list `cat` as their parent —
  // shown as a heads-up (moving `cat` moves them all with it), not a
  // restriction: nesting depth is unlimited, so a category with
  // sub-categories of its own can still become a sub-category itself.
  childCount: number;
  savingId: string | null;
  startEditing: (cat: ToolCategoryRow) => void;
  handleRename: (id: string) => void;
  setEditingId: (id: string | null) => void;
  seoOpenId: string | null;
  toggleSeo: (cat: ToolCategoryRow) => void;
  seoDraft: ToolCategorySeo;
  setSeoDraft: React.Dispatch<React.SetStateAction<ToolCategorySeo>>;
  savingSeoId: string | null;
  seoError: string | null;
  handleSaveSeo: (cat: ToolCategoryRow) => void;
  setSeoOpenId: (id: string | null) => void;
  deletingId: string | null;
  handleDelete: (cat: ToolCategoryRow) => void;
  onAddSubcategory?: (cat: ToolCategoryRow) => void;
}) {
  return (
    <div style={depth > 0 ? { marginLeft: Math.min(depth, 6) * 28 } : undefined}>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-indigo-200 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-900">
        <CategoryIcon isNested={depth > 0} />

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
            <label className="block text-xs">
              <span className="font-medium text-gray-500">Parent Category</span>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
                value={editingParentId}
                onChange={(e) => setEditingParentId(e.target.value)}
              >
                <option value="">-- Top-Level Category --</option>
                {parentOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {"— ".repeat(o.depth)}
                    {o.name}
                  </option>
                ))}
              </select>
              {childCount > 0 ? (
                <span className="mt-1 block text-gray-400">
                  Has {childCount} sub-categor{childCount === 1 ? "y" : "ies"} of its own — they&apos;ll
                  move along with it.
                </span>
              ) : null}
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
            </div>
            <ToolCountPills toolCount={cat.toolCount} publishedCount={cat.publishedCount} />
            <div className="flex w-full shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-gray-200 pl-12 text-sm sm:w-auto sm:border-l sm:pl-3 dark:border-gray-800">
              <a
                href={`/tools/category/${cat.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-gray-800 hover:underline dark:text-gray-400 dark:hover:text-gray-200"
              >
                View
              </a>
              {onAddSubcategory ? (
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

export default function ToolCategoriesManager({ initial }: { initial: ToolCategoryRow[] }) {
  const router = useRouter();
  const [categories, setCategories] = useState<ToolCategoryRow[]>(initial);
  const [newName, setNewName] = useState("");
  // Empty string = new category will be top-level; otherwise the id of the
  // category it becomes a sub-category of (at any depth).
  const [newParentId, setNewParentId] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingHeroSubheading, setEditingHeroSubheading] = useState("");
  const [editingHeroDescription, setEditingHeroDescription] = useState("");
  // "" = top-level; otherwise the id of the category this row is being
  // filed under while its edit form is open.
  const [editingParentId, setEditingParentId] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // SEO panel — inline on this same page, the same pattern as the Blog
  // Categories manager, rather than a link out to the general SEO Manager.
  const [seoOpenId, setSeoOpenId] = useState<string | null>(null);
  const [seoDraft, setSeoDraft] = useState<ToolCategorySeo>(EMPTY_SEO);
  const [savingSeoId, setSavingSeoId] = useState<string | null>(null);
  const [seoError, setSeoError] = useState<string | null>(null);

  const topLevelCategories = categories.filter((c) => !c.parentId);
  const childrenByParentId = buildChildrenMap(categories);
  const flatCategories = flattenTree(topLevelCategories, childrenByParentId);

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

  function startAddSubcategory(cat: ToolCategoryRow) {
    setNewParentId(cat.id);
    nameInputRef.current?.focus();
    nameInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
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
        body: JSON.stringify({ name: newName.trim(), parentId: newParentId || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create the category.");
        return;
      }
      setCategories((prev) =>
        [
          ...prev,
          {
            ...data.category,
            publishedCount: 0,
            heroSubheading: "",
            heroDescription: "",
            seo: EMPTY_SEO,
          } as ToolCategoryRow,
        ].sort((a, b) => a.name.localeCompare(b.name))
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

  function startEditing(cat: ToolCategoryRow) {
    setEditingId(cat.id);
    setEditingName(cat.name);
    setEditingHeroSubheading(cat.heroSubheading);
    setEditingHeroDescription(cat.heroDescription);
    setEditingParentId(cat.parentId ?? "");
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
          parentId: editingParentId || null,
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
                  parentId: data.category.parentId ?? null,
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
    const childCount = childrenByParentId.get(cat.id)?.length ?? 0;
    const grandparentName = cat.parentId
      ? categories.find((c) => c.id === cat.parentId)?.name
      : null;
    const parts: string[] = [];
    if (cat.toolCount > 0) {
      parts.push(
        `leave ${cat.toolCount === 1 ? "that tool" : `those ${cat.toolCount} tools`} uncategorized`
      );
    }
    if (childCount > 0) {
      const childLabel = childCount === 1 ? "its sub-category" : `its ${childCount} sub-categories`;
      parts.push(
        grandparentName
          ? `move ${childLabel} up under "${grandparentName}"`
          : `turn ${childLabel} into top-level categories`
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
      const res = await fetch(`/api/tool-categories/${cat.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not delete the category.");
        return;
      }
      // Match the API: children are re-filed under the deleted category's
      // OWN parent (cat.parentId — null if it was top-level), not always
      // bumped to top-level.
      setCategories((prev) =>
        prev
          .filter((c) => c.id !== cat.id)
          .map((c) => (c.parentId === cat.id ? { ...c, parentId: cat.parentId } : c))
      );
      if (newParentId === cat.id) setNewParentId("");
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  const selectedParentName = flatCategories.find((c) => c.id === newParentId)?.name;

  /** Renders `cat`'s row plus every descendant beneath it, recursively —
   * this is what lets the tree go as deep as the data actually is (root ->
   * topic -> country -> ... ) instead of a hard-coded two levels. */
  function renderCategoryNode(cat: ToolCategoryRow, depth: number): React.ReactNode {
    const excluded = new Set([cat.id, ...getDescendantIds(cat.id, childrenByParentId)]);
    const parentOptions = flatCategories.filter((o) => !excluded.has(o.id));
    return (
      <div key={cat.id} className="space-y-2">
        <CategoryRow
          cat={cat}
          depth={depth}
          editingId={editingId}
          editingName={editingName}
          setEditingName={setEditingName}
          editingHeroSubheading={editingHeroSubheading}
          setEditingHeroSubheading={setEditingHeroSubheading}
          editingHeroDescription={editingHeroDescription}
          setEditingHeroDescription={setEditingHeroDescription}
          editingParentId={editingParentId}
          setEditingParentId={setEditingParentId}
          parentOptions={parentOptions}
          childCount={childrenByParentId.get(cat.id)?.length ?? 0}
          savingId={savingId}
          startEditing={startEditing}
          handleRename={handleRename}
          setEditingId={setEditingId}
          seoOpenId={seoOpenId}
          toggleSeo={toggleSeo}
          seoDraft={seoDraft}
          setSeoDraft={setSeoDraft}
          savingSeoId={savingSeoId}
          seoError={seoError}
          handleSaveSeo={handleSaveSeo}
          setSeoOpenId={setSeoOpenId}
          deletingId={deletingId}
          handleDelete={handleDelete}
          onAddSubcategory={startAddSubcategory}
        />
        {(childrenByParentId.get(cat.id) ?? []).map((child) => renderCategoryNode(child, depth + 1))}
      </div>
    );
  }

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
              newParentId ? "New sub-category name, e.g. Payroll Calculators" : "New category name, e.g. Finance Calculators"
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
            {flatCategories.map((o) => (
              <option key={o.id} value={o.id}>
                {"— ".repeat(o.depth)}
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
        {topLevelCategories.map((cat) => renderCategoryNode(cat, 0))}

        {categories.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400 dark:border-gray-800">
            No categories yet — add your first one above.
          </p>
        ) : null}
      </div>
    </div>
  );
}
