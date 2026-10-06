"use client";

import { useState } from "react";
import RichTextEditor from "./RichTextEditor";

function countWords(html: string) {
  const text = html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").trim();
  return text ? text.split(/\s+/).length : 0;
}

/** Rich text editor for a calculator category's long-form content (shown under its grid on the public page). */
export default function CategoryContentForm({ id, slug, initial }: { id: string; slug: string; initial: string }) {
  const [content, setContent] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const words = countWords(content);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/tool-categories/${id}/content`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json().catch(() => ({}));
      setMessage(res.ok ? { ok: true, text: "Saved." } : { ok: false, text: data.error ?? "Could not save." });
    } catch {
      setMessage({ ok: false, text: "Network error — please try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-4">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Category Content</h2>
          <span className={`text-xs font-medium ${words >= 1500 ? "text-emerald-600" : "text-gray-400"}`}>
            {words.toLocaleString()} words
          </span>
        </div>
        <RichTextEditor value={content} onChange={setContent} />
      </section>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Content"}
        </button>
        <a
          href={`/tools/category/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-gray-300 px-5 py-2.5 font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          View Page ↗
        </a>
        {message ? (
          <span className={`text-sm ${message.ok ? "text-emerald-600" : "text-red-600"}`}>{message.text}</span>
        ) : null}
      </div>
    </div>
  );
}
