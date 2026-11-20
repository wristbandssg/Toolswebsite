"use client";

import { useEffect, useState } from "react";
import type { QcCheck } from "@/lib/ai-writer";

/**
 * "Write with AI" box shown at the top of the tool and blog edit forms.
 * Sends the page's current details to /api/ai-writer, then hands the draft
 * back to the form (which fills its fields). Nothing is saved until the
 * admin reviews the draft and presses the form's normal Save button.
 */
export default function AiWriterPanel<TDraft>({
  kind,
  buildRequest,
  hasContent,
  onApply,
}: {
  kind: "tool" | "blog";
  /** Current form values to send (title, inputs, existing content…). Return a string to show an error instead. */
  buildRequest: () => Record<string, unknown> | string;
  /** True when the form already has content that the draft would replace. */
  hasContent: boolean;
  onApply: (draft: TDraft) => void;
}) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [qc, setQc] = useState<QcCheck[] | null>(null);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);

  async function run() {
    const body = buildRequest();
    if (typeof body === "string") {
      setError(body);
      return;
    }
    if (hasContent && !confirm("Replace the current content with a new AI draft? (It uses the current text as a starting point. Nothing is saved until you press Save.)")) {
      return;
    }
    setBusy(true);
    setSeconds(0);
    setError(null);
    setQc(null);
    try {
      const res = await fetch("/api/ai-writer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, kind, notes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      onApply(data.draft as TDraft);
      setQc(data.qc as QcCheck[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Writing failed");
    } finally {
      setBusy(false);
    }
  }

  const passed = qc?.filter((c) => c.ok).length ?? 0;

  return (
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5 dark:border-indigo-900 dark:bg-indigo-950/40">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">✨ AI Content Writer</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            {kind === "tool"
              ? "Writes the description, About, Examples, Assumptions, FAQ and SEO meta for this calculator."
              : "Writes the title, slug, excerpt, full post, tags and SEO meta for this post."}{" "}
            Follows the site&apos;s SEO rules and links only to real pages. Review, then press Save.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? `Writing… ${seconds}s` : hasContent ? "Rewrite with AI" : "Write with AI"}
        </button>
      </div>

      <label className="mt-3 block text-sm">
        <span className="font-medium">Notes for the writer</span>
        <span className="ml-1 text-xs text-gray-400">(optional: focus keyword, audience, points to cover)</span>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={kind === "tool" ? "e.g. focus keyword: mortgage payment calculator; mention PMI" : "e.g. compare 15 vs 30 year; audience: first-time buyers"}
          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
        />
      </label>

      {busy ? <p className="mt-2 text-xs text-gray-500">This usually takes 1 to 3 minutes. Keep this tab open.</p> : null}
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

      {qc ? (
        <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3 text-sm dark:border-gray-700 dark:bg-gray-900">
          <p className="font-medium">
            Draft filled in below. Quick check: {passed}/{qc.length} passed
          </p>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {qc.map((c) => (
              <li key={c.label} className={c.ok ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"}>
                {c.ok ? "✓" : "⚠"} {c.label} <span className="text-gray-400">({c.detail})</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-gray-500">Read it once and check numbers and facts before saving.</p>
        </div>
      ) : null}
    </section>
  );
}
