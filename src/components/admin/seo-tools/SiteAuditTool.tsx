"use client";

import { useState } from "react";
import type { SiteAuditResult } from "@/lib/seo-tools/site-audit";

const GRADE_STYLES: Record<SiteAuditResult["grade"], string> = {
  A: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",
  B: "bg-lime-50 text-lime-700 ring-lime-200 dark:bg-lime-950/40 dark:text-lime-300 dark:ring-lime-900",
  C: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
  D: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900",
};

const card = "rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900";
const input = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800";

function csvCell(v: unknown) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(r: SiteAuditResult) {
  const rows: [string, unknown][] = [
    ["URL", r.url],
    ["Final URL", r.finalUrl],
    ["Status", r.statusCode],
    ["Score", r.score],
    ["Grade", r.grade],
    ["Load time (s)", r.loadTimeS],
    ["Page size (KB)", r.pageSizeKb],
    ...Object.entries(r.metrics).map(([k, v]) => [k, Array.isArray(v) ? v.join("; ") : v] as [string, unknown]),
    ...r.issues.map((i) => ["Issue", i] as [string, unknown]),
    ...r.passed.map((p) => ["Passed", p] as [string, unknown]),
  ];
  const blob = new Blob([rows.map(([k, v]) => `${csvCell(k)},${csvCell(v)}`).join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `site-audit-${new URL(r.finalUrl).hostname}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function SiteAuditTool({ defaultUrl }: { defaultUrl: string }) {
  const [url, setUrl] = useState(defaultUrl);
  const [keyword, setKeyword] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SiteAuditResult | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/seo-tools/site-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), keyword: keyword.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `The audit failed (${res.status}).`);
        return;
      }
      setResult(data.result);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setRunning(false);
    }
  }

  const m = result?.metrics;
  const metricRows: [string, string | number][] = m && result
    ? [
        ["Status code", result.statusCode],
        ["Load time", `${result.loadTimeS}s`],
        ["Page size", `${result.pageSizeKb} KB`],
        ["Title length", `${m.titleLength} chars`],
        ["Meta description", `${m.metaDescriptionLength} chars`],
        ["H1 tags", m.h1Count],
        ["H2 tags", m.h2Count],
        ["Words (main content)", m.wordCount],
        ["Images", `${m.images} (${m.imagesNoAlt} without alt)`],
        ["Internal links", m.internalLinks],
        ["External links", m.externalLinks],
        ["Schema types", m.schemaTypes.length ? m.schemaTypes.join(", ") : "none"],
        ...(m.keywordFrequency !== undefined
          ? ([
              ["Keyword frequency", m.keywordFrequency],
              ["Keyword density", `${m.keywordDensity}%`],
            ] as [string, string | number][])
          : []),
      ]
    : [];

  return (
    <div className="space-y-6">
      <form onSubmit={run} className={`${card} grid gap-3 sm:grid-cols-[1fr_16rem_auto] sm:items-end`}>
        <label className="text-sm">
          <span className="font-medium">Page URL</span>
          <input className={`${input} mt-1`} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" required />
        </label>
        <label className="text-sm">
          <span className="font-medium">Target keyword (optional)</span>
          <input className={`${input} mt-1`} value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g. loan calculator" />
        </label>
        <button
          type="submit"
          disabled={running || !url.trim()}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {running ? "Auditing…" : "Run Audit"}
        </button>
        {error ? <p className="text-sm text-red-600 sm:col-span-3">{error}</p> : null}
      </form>

      {result && m ? (
        <>
          <section className={`${card} flex flex-wrap items-center gap-5`}>
            <span className={`flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl text-3xl font-black ring-1 ring-inset ${GRADE_STYLES[result.grade]}`}>
              {result.grade}
              <span className="text-xs font-semibold">{result.score}/100</span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{m.title || "(no title)"}</p>
              <a href={result.finalUrl} target="_blank" rel="noopener noreferrer" className="block truncate text-sm text-indigo-600 hover:underline">
                {result.finalUrl}
              </a>
              <p className="mt-1 text-sm text-gray-500">
                <span className="font-medium text-emerald-600">{result.passed.length} passed</span> ·{" "}
                <span className="font-medium text-red-600">{result.issues.length} issues</span>
                {result.redirects.length ? ` · redirected ${result.redirects.length}× from ${result.url}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => downloadCsv(result)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Download CSV
            </button>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className={card}>
              <h2 className="font-semibold">❌ Issues ({result.issues.length})</h2>
              {result.issues.length ? (
                <ul className="mt-3 space-y-2 text-sm">
                  {result.issues.map((i) => (
                    <li key={i} className="rounded-lg bg-red-50 px-3 py-2 text-red-800 dark:bg-red-950/30 dark:text-red-300">
                      {i}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-gray-500">No issues found.</p>
              )}
            </section>
            <section className={card}>
              <h2 className="font-semibold">✅ Passed ({result.passed.length})</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {result.passed.map((p) => (
                  <li key={p} className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                    {p}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className={card}>
            <h2 className="font-semibold">📊 Key Metrics</h2>
            <dl className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              {metricRows.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-gray-100 py-1.5 dark:border-gray-800">
                  <dt className="text-gray-500">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 space-y-2 text-sm">
              <p>
                <span className="text-gray-500">Meta description: </span>
                {m.metaDescription || <em className="text-gray-400">none</em>}
              </p>
              <p>
                <span className="text-gray-500">H1: </span>
                {m.h1Text || <em className="text-gray-400">none</em>}
              </p>
              <p className="break-all">
                <span className="text-gray-500">Canonical: </span>
                {m.canonical || <em className="text-gray-400">none</em>}
              </p>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
