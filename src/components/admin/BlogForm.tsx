"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RichTextEditor from "./RichTextEditor";

export interface BlogSeoValues {
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  ogImage: string;
  robotsIndex: boolean;
  schemaType: string;
}

const EMPTY_SEO: BlogSeoValues = {
  metaTitle: "",
  metaDescription: "",
  canonicalUrl: "",
  ogImage: "",
  robotsIndex: true,
  schemaType: "",
};

export interface BlogFormValues {
  id: string; // Mongo ObjectId — empty until the post is first created
  slug: string;
  title: string;
  excerpt: string;
  featuredImage: string;
  content: string;
  tags: string; // comma-separated in the form, converted to array on submit
  status: "draft" | "in_review" | "published" | "needs_update";
  publishedAt: string; // yyyy-mm-dd
  categoryId: string;
  toolIds: string[];
  relatedBlogIds: string[];
  seo: BlogSeoValues;
}

const EMPTY: BlogFormValues = {
  id: "",
  slug: "",
  title: "",
  excerpt: "",
  featuredImage: "",
  content: "",
  tags: "",
  status: "draft",
  publishedAt: "",
  categoryId: "",
  toolIds: [],
  relatedBlogIds: [],
  seo: EMPTY_SEO,
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

export default function BlogForm({
  mode,
  initial,
  categories,
  tools,
  otherBlogs,
}: {
  mode: "create" | "edit";
  initial?: Partial<BlogFormValues>;
  categories: { id: string; name: string; parentId?: string | null }[];
  tools: { id: string; title: string }[];
  otherBlogs: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<BlogFormValues>({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sub-categories are just regular categories with a parentId — group them
  // directly under their parent in the dropdown (indented) instead of
  // listing every category alphabetically flat, so the hierarchy set up on
  // the Categories page is visible here too.
  const topLevelCategories = categories.filter((c) => !c.parentId);
  const groupedCategoryOptions = topLevelCategories.flatMap((parent) => [
    parent,
    ...categories.filter((c) => c.parentId === parent.id),
  ]);
  // Fallback for the unexpected case of a parentId that doesn't match any
  // top-level category in this list (e.g. stale data) — still show it
  // rather than silently dropping it from the dropdown.
  const groupedIds = new Set(groupedCategoryOptions.map((c) => c.id));
  const categoryOptions = [...groupedCategoryOptions, ...categories.filter((c) => !groupedIds.has(c.id))];

  function update<K extends keyof BlogFormValues>(key: K, val: BlogFormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  function updateSeo<K extends keyof BlogSeoValues>(key: K, val: BlogSeoValues[K]) {
    setValues((v) => ({ ...v, seo: { ...v.seo, [key]: val } }));
  }

  function toggleId(key: "toolIds" | "relatedBlogIds", id: string) {
    const current = values[key];
    update(key, current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  }

  async function handleFeaturedImageUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/media/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Image upload failed.");
        return;
      }
      update("featuredImage", data.media.url as string);
    } catch {
      setError("Network error while uploading the image.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        slug: values.slug,
        title: values.title,
        excerpt: values.excerpt || null,
        featuredImage: values.featuredImage || null,
        content: values.content,
        tags: values.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        status: values.status,
        publishedAt: values.publishedAt || null,
        categoryId: values.categoryId || null,
        toolIds: values.toolIds,
        relatedBlogIds: values.relatedBlogIds,
      };
      const res = await fetch(
        mode === "create" ? "/api/blogs" : `/api/blogs/${values.slug}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save the post.");
        return;
      }

      const blogId = data.blog?.id as string | undefined;
      if (blogId) {
        try {
          await fetch(`/api/seo/blog/${blogId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values.seo),
          });
        } catch {
          // The post itself saved fine — don't block navigation over the SEO
          // sidecar write failing.
        }
      }

      router.push("/admin/blogs");
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-6xl">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="min-w-0 space-y-8">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 font-semibold">Basic Info</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className="font-medium">Title</span>
                <input
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                  value={values.title}
                  onChange={(e) => {
                    update("title", e.target.value);
                    if (!slugTouched) update("slug", slugify(e.target.value));
                  }}
                />
              </label>
              <label className="text-sm">
                <span className="font-medium">Slug / URL</span>
                <input
                  required
                  disabled={mode === "edit"}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800"
                  value={values.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    update("slug", slugify(e.target.value));
                  }}
                />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="font-medium">Short Description</span>
                <textarea
                  rows={2}
                  maxLength={300}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                  placeholder="A one or two sentence summary — shown on the blog list and used as the search-result description."
                  value={values.excerpt}
                  onChange={(e) => update("excerpt", e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 font-semibold">Content</h2>
            <RichTextEditor value={values.content} onChange={(html) => update("content", html)} />
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 font-semibold">SEO</h2>
            <div className="space-y-4">
              <label className="block text-sm">
                <span className="font-medium">Meta Title</span>
                <input
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                  placeholder={values.title || "Falls back to the post title"}
                  value={values.seo.metaTitle}
                  onChange={(e) => updateSeo("metaTitle", e.target.value)}
                  maxLength={70}
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium">Meta Description</span>
                <textarea
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                  rows={3}
                  placeholder={values.excerpt || "Falls back to the post's short description"}
                  value={values.seo.metaDescription}
                  onChange={(e) => updateSeo("metaDescription", e.target.value)}
                  maxLength={160}
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="font-medium">Canonical URL</span>
                  <input
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                    placeholder="Leave blank to use this post's own URL"
                    value={values.seo.canonicalUrl}
                    onChange={(e) => updateSeo("canonicalUrl", e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium">Schema.org Type</span>
                  <input
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                    placeholder="e.g. Article (optional)"
                    value={values.seo.schemaType}
                    onChange={(e) => updateSeo("schemaType", e.target.value)}
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-1 font-semibold">Tool Relations</h2>
            <p className="mb-4 text-sm text-gray-500">
              Pick which Calculator Tools this post should appear on as a &quot;Support
              Blog&quot; — it will be linked from that tool&apos;s page.
            </p>
            <div className="flex flex-wrap gap-2">
              {tools.map((t) => (
                <label
                  key={t.id}
                  className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${
                    values.toolIds.includes(t.id)
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mr-1.5"
                    checked={values.toolIds.includes(t.id)}
                    onChange={() => toggleId("toolIds", t.id)}
                  />
                  {t.title}
                </label>
              ))}
              {tools.length === 0 ? (
                <p className="text-sm text-gray-400">No tools have been created yet.</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-1 font-semibold">Related Blog Posts</h2>
            <p className="mb-4 text-sm text-gray-500">
              Choose which posts show up under &quot;Read More&quot; at the bottom of this post.
            </p>
            <div className="flex flex-wrap gap-2">
              {otherBlogs.map((b) => (
                <label
                  key={b.id}
                  className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${
                    values.relatedBlogIds.includes(b.id)
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mr-1.5"
                    checked={values.relatedBlogIds.includes(b.id)}
                    onChange={() => toggleId("relatedBlogIds", b.id)}
                  />
                  {b.title}
                </label>
              ))}
              {otherBlogs.length === 0 ? (
                <p className="text-sm text-gray-400">There are no other blog posts yet.</p>
              ) : null}
            </div>
          </section>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        {/* Sidebar */}
        <div className="space-y-6 lg:sticky lg:top-6 lg:h-fit">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 font-semibold">Publish</h2>
            <div className="space-y-4">
              <label className="block text-sm">
                <span className="font-medium">Status</span>
                <select
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                  value={values.status}
                  onChange={(e) => update("status", e.target.value as BlogFormValues["status"])}
                >
                  <option value="draft">Draft</option>
                  <option value="in_review">In Review</option>
                  <option value="published">Published</option>
                  <option value="needs_update">Needs Update</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-medium">Published Date</span>
                <input
                  type="date"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                  value={values.publishedAt}
                  onChange={(e) => update("publishedAt", e.target.value)}
                />
              </label>
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : mode === "create" ? "Create Blog Post" : "Save Changes"}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 font-semibold">Featured Image</h2>
            <div className="space-y-2">
              {values.featuredImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={values.featuredImage}
                  alt=""
                  className="aspect-video w-full rounded-lg border border-gray-200 object-cover dark:border-gray-700"
                />
              ) : null}
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                placeholder="https://... (paste an image URL)"
                value={values.featuredImage}
                onChange={(e) => update("featuredImage", e.target.value)}
              />
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFeaturedImageUpload(file);
                  }}
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  {uploading ? "Uploading..." : "Upload Image"}
                </button>
                {values.featuredImage ? (
                  <button
                    type="button"
                    onClick={() => update("featuredImage", "")}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Category</h2>
              <Link
                href="/admin/blogs/categories"
                target="_blank"
                className="text-xs font-medium text-indigo-600 hover:underline"
              >
                Manage Categories →
              </Link>
            </div>
            <label className="block text-sm">
              <span className="font-medium">Choose a category</span>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                value={values.categoryId}
                onChange={(e) => update("categoryId", e.target.value)}
              >
                <option value="">-- None --</option>
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parentId ? `— ${c.name}` : c.name}
                  </option>
                ))}
              </select>
            </label>
          </section>
        </div>
      </div>
    </form>
  );
}
