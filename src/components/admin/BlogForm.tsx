"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface BlogFormValues {
  slug: string;
  title: string;
  featuredImage: string;
  content: string;
  tags: string; // comma-separated in the form, converted to array on submit
  status: "draft" | "in_review" | "published" | "needs_update";
  publishedAt: string; // yyyy-mm-dd
  categoryId: string;
  newCategoryName: string;
  toolIds: string[];
  relatedBlogIds: string[];
}

const EMPTY: BlogFormValues = {
  slug: "",
  title: "",
  featuredImage: "",
  content: "",
  tags: "",
  status: "draft",
  publishedAt: "",
  categoryId: "",
  newCategoryName: "",
  toolIds: [],
  relatedBlogIds: [],
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
  categories: { id: string; name: string }[];
  tools: { id: string; title: string }[];
  otherBlogs: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<BlogFormValues>({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");

  function update<K extends keyof BlogFormValues>(key: K, val: BlogFormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  function toggleId(key: "toolIds" | "relatedBlogIds", id: string) {
    const current = values[key];
    update(key, current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        slug: values.slug,
        title: values.title,
        featuredImage: values.featuredImage || null,
        content: values.content,
        tags: values.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        status: values.status,
        publishedAt: values.publishedAt || null,
        categoryId: values.categoryId || null,
        newCategoryName: values.newCategoryName || null,
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
        setError(data.error ?? "Save করা যায়নি।");
        return;
      }
      router.push("/admin/blogs");
      router.refresh();
    } catch {
      setError("নেটওয়ার্ক সমস্যা — আবার চেষ্টা করুন।");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-8">
      {/* Basic Info */}
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
          <label className="text-sm">
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
          <label className="text-sm">
            <span className="font-medium">Published Date</span>
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              value={values.publishedAt}
              onChange={(e) => update("publishedAt", e.target.value)}
            />
            <span className="mt-1 block text-xs text-gray-400">
              Status &quot;Published&quot; করলে খালি রাখলে আজকের তারিখ বসবে।
            </span>
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="font-medium">Featured Image URL</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              placeholder="https://..."
              value={values.featuredImage}
              onChange={(e) => update("featuredImage", e.target.value)}
            />
            <span className="mt-1 block text-xs text-gray-400">
              Media Library তৈরি হলে (পরবর্তী ধাপে) এখান থেকে সরাসরি Select করা যাবে।
            </span>
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="font-medium">Tags</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              placeholder="finance, budgeting, tips (কমা দিয়ে আলাদা করুন)"
              value={values.tags}
              onChange={(e) => update("tags", e.target.value)}
            />
          </label>
        </div>
      </section>

      {/* Category */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-4 font-semibold">Category</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="font-medium">বিদ্যমান Category বেছে নিন</span>
            <select
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              value={values.categoryId}
              onChange={(e) => update("categoryId", e.target.value)}
            >
              <option value="">-- কোনোটা না --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="font-medium">অথবা নতুন Category-এর নাম দিন</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              placeholder="e.g. Budgeting Tips"
              value={values.newCategoryName}
              onChange={(e) => update("newCategoryName", e.target.value)}
            />
          </label>
        </div>
      </section>

      {/* Content */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-4 font-semibold">Content</h2>
        <label className="block text-sm">
          <span className="font-medium">Blog Content (HTML লেখা যাবে)</span>
          <textarea
            required
            rows={12}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-700 dark:bg-gray-800"
            value={values.content}
            onChange={(e) => update("content", e.target.value)}
          />
        </label>
      </section>

      {/* Tool Relations */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-1 font-semibold">Tool Relations</h2>
        <p className="mb-4 text-sm text-gray-500">
          এই Blog-টা কোন কোন Calculator Tool-এর &quot;Support Blog&quot; হিসেবে দেখাবে — সেই Tool-এর
          Page-এ এটা লিংক হবে।
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
            <p className="text-sm text-gray-400">এখনো কোনো Tool তৈরি হয়নি।</p>
          ) : null}
        </div>
      </section>

      {/* Related Blogs */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-1 font-semibold">Related Blog Posts</h2>
        <p className="mb-4 text-sm text-gray-500">
          এই Blog-এর নিচে &quot;আরও পড়ুন&quot; অংশে কোন কোন Post দেখাবে।
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
            <p className="text-sm text-gray-400">এখনো অন্য কোনো Blog Post নেই।</p>
          ) : null}
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? "Saving..." : mode === "create" ? "Create Blog Post" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
