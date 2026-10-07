"use client";

import { useState } from "react";
import type { Cell, SeoToolInfo, ToolField, ToolReport } from "@/lib/seo-tools/types";

// The generic screen for every SEO tool: a form built from the tool's fields
// and a view for its report (stats, issues, tables with CSV download, lists,
// code blocks).

const card = "rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900";
const input = "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800";

const GRADE_STYLES: Record<string, string> = {
  A: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",
  B: "bg-lime-50 text-lime-700 ring-lime-200 dark:bg-lime-950/40 dark:text-lime-300 dark:ring-lime-900",
  C: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
  D: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900",
};

function csvCell(v: Cell) {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function download(name: string, columns: string[], rows: Cell[][]) {
  const csv = [columns, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function CellView({ value }: { value: Cell }) {
  if (typeof value === "string" && /^https?:\/\//.test(value) && !value.includes(" ")) {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer" className="inline-block min-w-[16rem] break-all text-indigo-600 hover:underline">
        {value}
      </a>
    );
  }
  return <>{value == null ? "" : String(value)}</>;
}

const PAGE = 100;

function TableSection({ title, columns, rows, note }: { title: string; columns: string[]; rows: Cell[][]; note?: string }) {
  const [shown, setShown] = useState(PAGE);
  return (
    <section className={card}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">
          {title} <span className="text-sm font-normal text-gray-400">({rows.length})</span>
        </h2>
        {rows.length ? (
          <button type="button" onClick={() => download(title, columns, rows)} className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
            Download CSV
          </button>
        ) : null}
      </div>
      {note ? <p className="mt-1 text-xs text-gray-500">{note}</p> : null}
      {rows.length ? (
        <div className="mt-3 max-h-[36rem] overflow-auto rounded-lg border border-gray-100 dark:border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800">
              <tr>
                {columns.map((c) => (
                  <th key={c} className="whitespace-nowrap px-3 py-2 font-semibold">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows.slice(0, shown).map((row, i) => (
                <tr key={i} className="align-top">
                  {row.map((v, j) => (
                    <td key={j} className="max-w-md px-3 py-2">
                      <CellView value={v} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-3 text-sm text-gray-500">Nothing to show.</p>
      )}
      {rows.length > shown ? (
        <button type="button" onClick={() => setShown((s) => s + PAGE)} className="mt-3 text-sm font-medium text-indigo-600 hover:underline">
          Show {Math.min(PAGE, rows.length - shown)} more
        </button>
      ) : null}
    </section>
  );
}

export function ReportView({ report }: { report: ToolReport }) {
  return (
    <div className="space-y-6">
      {report.headline || report.score !== undefined || report.stats?.length ? (
        <section className={`${card} flex flex-wrap items-center gap-5`}>
          {report.grade ? (
            <span className={`flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl text-3xl font-black ring-1 ring-inset ${GRADE_STYLES[report.grade] ?? GRADE_STYLES.C}`}>
              {report.grade}
              {report.score !== undefined ? <span className="text-xs font-semibold">{report.score}/100</span> : null}
            </span>
          ) : null}
          <div className="min-w-0 flex-1 space-y-3">
            {report.headline ? <p className="font-semibold">{report.headline}</p> : null}
            {report.stats?.length ? (
              <dl className="flex flex-wrap gap-2">
                {report.stats.map((s) => (
                  <div key={s.label} className="rounded-lg bg-gray-50 px-3 py-1.5 text-sm dark:bg-gray-800">
                    <dt className="text-xs text-gray-500">{s.label}</dt>
                    <dd className="font-semibold">{String(s.value ?? "")}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </section>
      ) : null}

      {report.issues?.length || report.passed?.length ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {report.issues?.length ? (
            <section className={card}>
              <h2 className="font-semibold">❌ Issues ({report.issues.length})</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {report.issues.map((i, k) => (
                  <li key={k} className="rounded-lg bg-red-50 px-3 py-2 text-red-800 dark:bg-red-950/30 dark:text-red-300">
                    {i}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {report.passed?.length ? (
            <section className={card}>
              <h2 className="font-semibold">✅ Passed ({report.passed.length})</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {report.passed.map((p, k) => (
                  <li key={k} className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                    {p}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}

      {report.sections?.map((s, i) => {
        if (s.kind === "table") return <TableSection key={i} {...s} />;
        if (s.kind === "list")
          return (
            <section key={i} className={card}>
              <h2 className="font-semibold">{s.title}</h2>
              <ul className="mt-3 space-y-1.5 text-sm">
                {s.items.map((item, k) => (
                  <li
                    key={k}
                    className={`rounded-lg px-3 py-1.5 ${
                      s.tone === "bad" ? "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300" : s.tone === "good" ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300" : "bg-gray-50 dark:bg-gray-800"
                    }`}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          );
        if (s.kind === "code")
          return (
            <section key={i} className={card}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">{s.title}</h2>
                <button type="button" onClick={() => navigator.clipboard?.writeText(s.code)} className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                  Copy
                </button>
              </div>
              <pre className="mt-3 max-h-[32rem] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-gray-900 p-4 text-xs text-gray-100">{s.code}</pre>
            </section>
          );
        return (
          <section key={i} className={card}>
            <h2 className="font-semibold">{s.title}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{s.text}</p>
          </section>
        );
      })}
    </div>
  );
}

function FieldInput({ field, value, onChange }: { field: ToolField; value: string | number | boolean; onChange: (v: string | number | boolean) => void }) {
  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" className="h-4 w-4" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
        {field.label}
      </label>
    );
  }
  return (
    <label className="block text-sm">
      <span className="font-medium">
        {field.label}
        {field.required ? <span className="text-red-500"> *</span> : null}
      </span>
      {field.type === "urls" || field.type === "textarea" ? (
        <textarea className={`${input} font-mono`} rows={field.type === "urls" ? 5 : 6} placeholder={field.placeholder} value={String(value)} onChange={(e) => onChange(e.target.value)} />
      ) : field.type === "select" ? (
        <select className={input} value={String(value)} onChange={(e) => onChange(e.target.value)}>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : field.type === "csv" ? (
        <input
          type="file"
          accept=".csv,.txt,.log,text/csv,text/plain"
          className={input}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            onChange(file ? await file.text() : "");
          }}
        />
      ) : (
        <input
          className={input}
          type={field.type === "number" ? "number" : "text"}
          step={field.type === "number" ? "any" : undefined}
          min={field.min}
          max={field.max}
          placeholder={field.placeholder}
          value={String(value)}
          onChange={(e) => onChange(field.type === "number" ? Number(e.target.value) : e.target.value)}
        />
      )}
      {field.hint ? <span className="mt-1 block text-xs text-gray-400">{field.hint}</span> : null}
    </label>
  );
}

export default function ToolRunner({ tool, defaults }: { tool: SeoToolInfo; defaults?: Record<string, string> }) {
  const [values, setValues] = useState<Record<string, string | number | boolean>>(() =>
    Object.fromEntries(tool.fields.map((f) => [f.name, defaults?.[f.name] ?? f.default ?? (f.type === "checkbox" ? false : "")]))
  );
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ToolReport | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/seo-tools/${tool.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: values }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `The tool failed (${res.status}).`);
        return;
      }
      setReport(data.report);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={run} className={`${card} space-y-4`}>
        <div className="grid gap-4 md:grid-cols-2">
          {tool.fields.map((f) => (
            <div key={f.name} className={f.type === "urls" || f.type === "textarea" ? "md:col-span-2" : undefined}>
              <FieldInput field={f} value={values[f.name]} onChange={(v) => setValues((s) => ({ ...s, [f.name]: v }))} />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={running} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
            {running ? "Running…" : "Run"}
          </button>
          {running ? <span className="text-sm text-gray-500">Fetching and analysing — this can take up to a minute for crawls.</span> : null}
          {error ? <span className="text-sm text-red-600">{error}</span> : null}
        </div>
      </form>
      {report ? <ReportView report={report} /> : null}
    </div>
  );
}
