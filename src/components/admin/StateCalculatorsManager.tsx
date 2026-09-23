"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export interface StateCalculatorRow {
  id: string;
  stateName: string;
  abbreviation: string;
  toolSlug: string | null;
  order: number;
}

const NOT_LINKED = "__none__";

/**
 * Admin manager for the "Other state calculators" grid shown on state tax
 * tool pages (see ToolContentSections + StateCalculatorGrid). All 50 states
 * are pre-seeded (prisma/seed-state-calculators.ts) so the public grid
 * always shows the full directory, matching how competitor sites present a
 * complete 50-state list — most start with no linked tool ("Coming soon")
 * and get wired up here, one at a time, as each state's calculator ships.
 * No redeploy needed to link a new one.
 */
export default function StateCalculatorsManager({
  initial,
  tools,
}: {
  initial: StateCalculatorRow[];
  tools: { slug: string; title: string }[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<StateCalculatorRow[]>(initial);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStateName, setEditStateName] = useState("");
  const [editAbbreviation, setEditAbbreviation] = useState("");
  const [editToolSlug, setEditToolSlug] = useState(NOT_LINKED);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [newStateName, setNewStateName] = useState("");
  const [newAbbreviation, setNewAbbreviation] = useState("");
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.stateName.toLowerCase().includes(q) || r.abbreviation.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const linkedCount = rows.filter((r) => r.toolSlug).length;

  function toolTitleFor(slug: string | null) {
    if (!slug) return null;
    return tools.find((t) => t.slug === slug)?.title ?? slug;
  }

  function startEditing(row: StateCalculatorRow) {
    setEditingId(row.id);
    setEditStateName(row.stateName);
    setEditAbbreviation(row.abbreviation);
    setEditToolSlug(row.toolSlug ?? NOT_LINKED);
    setError(null);
  }

  async function handleSave(id: string) {
    setSavingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/state-calculators/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stateName: editStateName.trim(),
          abbreviation: editAbbreviation.trim(),
          toolSlug: editToolSlug === NOT_LINKED ? null : editToolSlug,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save that entry.");
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...data.link } : r)));
      setEditingId(null);
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(row: StateCalculatorRow) {
    if (!window.confirm(`Remove "${row.stateName}" from the state calculators list?`)) return;
    setDeletingId(row.id);
    setError(null);
    try {
      const res = await fetch(`/api/state-calculators/${row.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not remove that entry.");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newStateName.trim() || !newAbbreviation.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/state-calculators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stateName: newStateName.trim(),
          abbreviation: newAbbreviation.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not add that entry.");
        return;
      }
      setRows((prev) => [...prev, data.link].sort((a, b) => a.order - b.order));
      setNewStateName("");
      setNewAbbreviation("");
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm dark:border-gray-800 dark:bg-gray-900">
        <span className="font-medium">{linkedCount}</span> of{" "}
        <span className="font-medium">{rows.length}</span> states are linked to a live calculator.
        The rest show as &quot;Coming soon&quot; on the public page — link one by picking its Tool
        below once that state&apos;s calculator is built. No redeploy needed.
      </div>

      <form
        onSubmit={handleCreate}
        className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
      >
        <input
          className="min-w-[10rem] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          placeholder="State name, e.g. District of Columbia"
          value={newStateName}
          onChange={(e) => setNewStateName(e.target.value)}
        />
        <input
          className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          placeholder="Abbr., e.g. DC"
          value={newAbbreviation}
          onChange={(e) => setNewAbbreviation(e.target.value)}
        />
        <button
          type="submit"
          disabled={creating || !newStateName.trim() || !newAbbreviation.trim()}
          className="shrink-0 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
        >
          {creating ? "Adding..." : "+ Add Entry"}
        </button>
      </form>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search states..."
          className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        />
      </div>

      <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 dark:bg-gray-950">
            <tr>
              <th className="px-4 py-3">State</th>
              <th className="px-4 py-3">Abbreviation</th>
              <th className="px-4 py-3">Linked Tool</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.map((row) =>
              editingId === row.id ? (
                <tr key={row.id} className="bg-indigo-50/50 dark:bg-indigo-950/20">
                  <td className="px-4 py-2">
                    <input
                      autoFocus
                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
                      value={editStateName}
                      onChange={(e) => setEditStateName(e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      className="w-20 rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
                      value={editAbbreviation}
                      onChange={(e) => setEditAbbreviation(e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
                      value={editToolSlug}
                      onChange={(e) => setEditToolSlug(e.target.value)}
                    >
                      <option value={NOT_LINKED}>— Not linked yet —</option>
                      {tools.map((t) => (
                        <option key={t.slug} value={t.slug}>
                          {t.title}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        disabled={savingId === row.id}
                        onClick={() => handleSave(row.id)}
                        className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50 dark:bg-white dark:text-gray-900"
                      >
                        {savingId === row.id ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-xs text-gray-500 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-medium">{row.stateName}</td>
                  <td className="px-4 py-3 text-gray-500">{row.abbreviation}</td>
                  <td className="px-4 py-3">
                    {row.toolSlug ? (
                      <a
                        href={`/tools/${row.toolSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline"
                      >
                        {toolTitleFor(row.toolSlug)}
                      </a>
                    ) : (
                      <span className="text-gray-400">Coming soon</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => startEditing(row)}
                        className="text-xs font-medium text-gray-600 hover:underline dark:text-gray-300"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === row.id}
                        onClick={() => handleDelete(row)}
                        className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                      >
                        {deletingId === row.id ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  {rows.length === 0 ? "No entries yet." : "No states match your search."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
