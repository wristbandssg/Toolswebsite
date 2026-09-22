"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SeoContentType } from "@/lib/seo";

export interface SeoFormValues {
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  ogImage: string;
  robotsIndex: boolean;
  schemaType: string;
}

const EMPTY: SeoFormValues = {
  metaTitle: "",
  metaDescription: "",
  canonicalUrl: "",
  ogImage: "",
  robotsIndex: true,
  schemaType: "",
};

export default function SeoForm({
  contentType,
  id,
  initial,
  backHref,
  fallbackTitle,
  fallbackDescription,
}: {
  contentType: SeoContentType;
  id: string;
  initial?: Partial<SeoFormValues>;
  backHref: string;
  fallbackTitle?: string;
  fallbackDescription?: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<SeoFormValues>({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof SeoFormValues>(key: K, val: SeoFormValues[K]) {
    setSaved(false);
    setValues((v) => ({ ...v, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/seo/${contentType}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save SEO settings.");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-4 font-semibold">Search &amp; Social</h2>
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="font-medium">Meta Title</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              placeholder={fallbackTitle ?? "Falls back to the content's own title"}
              value={values.metaTitle}
              onChange={(e) => update("metaTitle", e.target.value)}
              maxLength={70}
            />
            <span className="mt-1 block text-xs text-gray-400">
              {values.metaTitle.length}/70 characters. Shown as the page title in search results.
            </span>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Meta Description</span>
            <textarea
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              rows={3}
              placeholder={fallbackDescription ?? "Falls back to the content's own description"}
              value={values.metaDescription}
              onChange={(e) => update("metaDescription", e.target.value)}
              maxLength={160}
            />
            <span className="mt-1 block text-xs text-gray-400">
              {values.metaDescription.length}/160 characters. Shown under the title in search
              results.
            </span>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Canonical URL</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              placeholder="Leave blank to use this page's own URL"
              value={values.canonicalUrl}
              onChange={(e) => update("canonicalUrl", e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Social Share Image (og:image)</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              placeholder="https://... (shown when this page is shared on social media)"
              value={values.ogImage}
              onChange={(e) => update("ogImage", e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Schema.org Type</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              placeholder="e.g. Article, Product, FAQPage (optional)"
              value={values.schemaType}
              onChange={(e) => update("schemaType", e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={values.robotsIndex}
              onChange={(e) => update("robotsIndex", e.target.checked)}
            />
            <span>Allow search engines to index this page</span>
          </label>
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {saved ? <p className="text-sm text-green-600">Saved.</p> : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save SEO Settings"}
        </button>
        <button
          type="button"
          onClick={() => router.push(backHref)}
          className="text-sm text-gray-500 hover:underline"
        >
          Back to SEO Dashboard
        </button>
      </div>
    </form>
  );
}
