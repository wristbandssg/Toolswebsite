"use client";

import { useState } from "react";
import type { CategoryPageSettings } from "@/lib/category-page-config";

/** Sets how many sub-category / calculator cards a category page shows before its "Show more" button. */
export default function CategoryPageSettingsForm({ initial }: { initial: CategoryPageSettings }) {
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/category-page-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      setMessage(res.ok ? { ok: true, text: "Saved." } : { ok: false, text: data.error ?? "Could not save." });
    } catch {
      setMessage({ ok: false, text: "Network error — please try again." });
    } finally {
      setSaving(false);
    }
  }

  const input =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800";

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <h2 className="font-semibold">Category Page Display</h2>
      <p className="mt-1 text-xs leading-relaxed text-gray-500">
        Cards shown before the &quot;Show more&quot; button. The button opens the rest on the same page.
      </p>
      <div className="mt-4 space-y-3">
        <label className="block text-sm">
          <span className="font-medium">Sub-categories shown</span>
          <input
            type="number"
            min={1}
            max={200}
            className={input}
            value={values.subcategoriesShown}
            onChange={(e) => setValues((v) => ({ ...v, subcategoriesShown: Number(e.target.value) }))}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Calculators shown</span>
          <input
            type="number"
            min={1}
            max={1000}
            className={input}
            value={values.toolsShown}
            onChange={(e) => setValues((v) => ({ ...v, toolsShown: Number(e.target.value) }))}
          />
        </label>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        {message ? (
          <span className={`text-sm ${message.ok ? "text-emerald-600" : "text-red-600"}`}>{message.text}</span>
        ) : null}
      </div>
    </section>
  );
}
