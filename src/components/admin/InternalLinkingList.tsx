"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface LinkSuggestion {
  id: string;
  anchorText: string;
  status: "suggested" | "approved" | "rejected";
  source: { type: "tool" | "blog"; title: string; editHref: string };
  target: { type: "tool" | "blog"; title: string; viewHref: string };
}

const STATUS_LABEL: Record<LinkSuggestion["status"], string> = {
  suggested: "Needs Review",
  approved: "Approved",
  rejected: "Rejected",
};

function SuggestionRow({
  suggestion,
  onDecide,
  busy,
}: {
  suggestion: LinkSuggestion;
  onDecide: (id: string, status: "approved" | "rejected") => void;
  busy: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
      <div className="flex items-start justify-between gap-4">
        <div className="text-sm">
          <p>
            In{" "}
            <a href={suggestion.source.editHref} className="font-medium text-indigo-600 hover:underline">
              {suggestion.source.title}
            </a>{" "}
            <span className="text-gray-400 capitalize">({suggestion.source.type})</span>, link the
            text &quot;{suggestion.anchorText}&quot; to{" "}
            <a href={suggestion.target.viewHref} className="font-medium text-indigo-600 hover:underline">
              {suggestion.target.title}
            </a>{" "}
            <span className="text-gray-400 capitalize">({suggestion.target.type})</span>.
          </p>
        </div>
        <span className="flex-shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium dark:bg-gray-800">
          {STATUS_LABEL[suggestion.status]}
        </span>
      </div>
      {suggestion.status === "suggested" ? (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onDecide(suggestion.id, "approved")}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            Approve
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDecide(suggestion.id, "rejected")}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Reject
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function InternalLinkingList({ initial }: { initial: LinkSuggestion[] }) {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState(initial);
  const [scanning, setScanning] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleScan() {
    setScanning(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/internal-linking/generate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not scan for link opportunities.");
        return;
      }
      setNotice(
        data.created > 0
          ? `Found ${data.created} new link ${data.created === 1 ? "opportunity" : "opportunities"}.`
          : "No new link opportunities found right now."
      );
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setScanning(false);
    }
  }

  async function handleDecide(id: string, status: "approved" | "rejected") {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/internal-linking/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not update this suggestion.");
        return;
      }
      setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusyId(null);
    }
  }

  const suggested = suggestions.filter((s) => s.status === "suggested");
  const approved = suggestions.filter((s) => s.status === "approved");
  const rejected = suggestions.filter((s) => s.status === "rejected");

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <button
          type="button"
          disabled={scanning}
          onClick={handleScan}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {scanning ? "Scanning..." : "Scan for Link Opportunities"}
        </button>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        {notice ? <p className="mt-2 text-sm text-green-600">{notice}</p> : null}
      </div>

      {suggested.length > 0 ? (
        <section>
          <h2 className="mb-3 font-semibold">Needs Review ({suggested.length})</h2>
          <div className="space-y-3">
            {suggested.map((s) => (
              <SuggestionRow key={s.id} suggestion={s} onDecide={handleDecide} busy={busyId === s.id} />
            ))}
          </div>
        </section>
      ) : null}

      {approved.length > 0 ? (
        <section>
          <h2 className="mb-1 font-semibold">Approved ({approved.length})</h2>
          <p className="mb-3 text-sm text-gray-500">
            Add these links by hand while editing the source content — approval here does not edit
            the content automatically.
          </p>
          <div className="space-y-3">
            {approved.map((s) => (
              <SuggestionRow key={s.id} suggestion={s} onDecide={handleDecide} busy={busyId === s.id} />
            ))}
          </div>
        </section>
      ) : null}

      {rejected.length > 0 ? (
        <section>
          <h2 className="mb-3 font-semibold text-gray-400">Rejected ({rejected.length})</h2>
          <div className="space-y-3 opacity-60">
            {rejected.map((s) => (
              <SuggestionRow key={s.id} suggestion={s} onDecide={handleDecide} busy={busyId === s.id} />
            ))}
          </div>
        </section>
      ) : null}

      {suggestions.length === 0 ? (
        <p className="text-sm text-gray-400">
          No link suggestions yet. Click &quot;Scan for Link Opportunities&quot; above to check
          your published Tools and Blog Posts for internal linking chances.
        </p>
      ) : null}
    </div>
  );
}
