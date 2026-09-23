"use client";

import { useState } from "react";
import type { CalcInputField, CalcResultConfig, CalcResultLineConfig } from "@/lib/calc-engine";

interface Props {
  toolSlug: string;
  fields: CalcInputField[];
  result: CalcResultConfig | null;
  // When set (non-empty), the calculator shows a full multi-line breakdown
  // instead of one number — e.g. gross pay / federal tax / FICA / net pay
  // all at once. Optional and additive: a tool with no `results` config
  // behaves exactly as before.
  results?: CalcResultLineConfig[] | null;
}

function defaultStep(min: number, max: number) {
  const span = max - min;
  if (span > 20000) return 1000;
  if (span > 1000) return 100;
  if (span > 100) return 10;
  if (span > 10) return 1;
  return span > 1 ? 0.5 : 0.1;
}

/**
 * Shared, reusable calculator UI (see plan doc, Section 7: "Reusable Input
 * Components"). Every Tool Template renders this same widget — only the
 * surrounding page layout differs between templates. The actual math runs
 * server-side via /api/tools/[id]/calculate so the formula never has to be
 * shipped to the browser.
 *
 * Layout: inputs on the left, a live results panel on the right — using a
 * container query (`@container` / `@lg:`) rather than a viewport breakpoint,
 * so it lays out by the WIDGET's own width, not the browser window's. That
 * matters because this same component also gets squeezed into a ~360px
 * sidebar (Tool Template 2, and the admin Live Preview panel) — a
 * viewport-based `lg:grid-cols-2` would force two columns into that narrow
 * space and break it. With a container query it only goes two-column when
 * it actually has room to.
 */
export default function CalculatorWidget({ toolSlug, fields, result, results }: Props) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      fields.map((f) => [f.key, f.default !== undefined ? String(f.default) : ""])
    )
  );
  const [output, setOutput] = useState<number | null>(null);
  const [breakdown, setBreakdown] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasCalculated, setHasCalculated] = useState(false);

  const hasBreakdownConfig = Boolean(results && results.length > 0);

  function setField(key: string, val: string) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  async function handleCalculate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const numericValues: Record<string, number> = {};
      for (const f of fields) {
        numericValues[f.key] = parseFloat(values[f.key]);
      }
      const res = await fetch(`/api/tools/${toolSlug}/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: numericValues }),
      });
      const data = await res.json();
      setHasCalculated(true);
      if (!res.ok) {
        setError(data.error ?? "Something went wrong while calculating.");
        setOutput(null);
        setBreakdown(null);
        return;
      }
      if (data.results && typeof data.results === "object") {
        setBreakdown(data.results);
        setOutput(null);
      } else {
        setOutput(data.result);
        setBreakdown(null);
      }
    } catch {
      setHasCalculated(true);
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  function formatValue(n: number, format?: "number" | "currency" | "percentage") {
    if (format === "currency") {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
    }
    if (format === "percentage") {
      return `${n.toFixed(2)}%`;
    }
    return n.toLocaleString();
  }

  function formatOutput(n: number) {
    return formatValue(n, result?.format);
  }

  const highlightLine = results?.find((line) => line.highlight) ?? null;
  const detailLines = (results ?? []).filter((line) => !line.highlight);
  const maxDetailValue = Math.max(
    1,
    ...detailLines.map((line) => Math.abs(breakdown?.[line.key] ?? 0))
  );

  return (
    <div className="@container w-full">
      <div className="grid grid-cols-1 gap-5 @lg:grid-cols-2 @lg:items-start">
        {/* Inputs */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
          <form onSubmit={handleCalculate} className="space-y-4">
            {fields.map((field) => {
              const showSlider =
                field.type !== "dropdown" &&
                field.type !== "date" &&
                field.min !== undefined &&
                field.max !== undefined;
              const numericValue = Number(values[field.key]);
              const sliderValue = Number.isFinite(numericValue) ? numericValue : field.min ?? 0;

              return (
                <label key={field.key} className="block text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-200">
                    {field.label}
                    {field.unit ? <span className="text-gray-400"> ({field.unit})</span> : null}
                  </span>

                  {field.type === "dropdown" && field.options ? (
                    <select
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                      value={values[field.key] ?? ""}
                      onChange={(e) => setField(field.key, e.target.value)}
                      required={field.required !== false}
                    >
                      <option value="" disabled>
                        Select...
                      </option>
                      {field.options.map((opt) => (
                        <option key={String(opt.value)} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="number"
                      inputMode="decimal"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                      value={values[field.key] ?? ""}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      required={field.required !== false}
                      onChange={(e) => setField(field.key, e.target.value)}
                    />
                  )}

                  {showSlider ? (
                    <input
                      type="range"
                      className="mt-2 w-full accent-indigo-600"
                      min={field.min}
                      max={field.max}
                      step={field.step ?? defaultStep(field.min!, field.max!)}
                      value={sliderValue}
                      onChange={(e) => setField(field.key, e.target.value)}
                      aria-label={`${field.label} slider`}
                    />
                  ) : null}
                </label>
              );
            })}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? "Calculating..." : "Calculate"}
            </button>
          </form>
        </div>

        {/* Results */}
        <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 dark:text-gray-400">
            <span aria-hidden>$</span> Results
          </h3>

          {!hasCalculated && !error ? (
            <div className="flex flex-1 items-center justify-center py-10 text-center text-sm text-gray-400">
              Enter your details and click Calculate to see your results.
            </div>
          ) : null}

          {error ? (
            <p className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          ) : null}

          {breakdown && !error && results ? (
            <div className="mt-3 space-y-4">
              {highlightLine && breakdown[highlightLine.key] !== undefined ? (
                <div className="rounded-xl bg-indigo-600 px-4 py-4 text-center text-white">
                  <p className="text-xs font-medium uppercase tracking-wide text-indigo-100">
                    {highlightLine.label}
                  </p>
                  <p className="mt-1 text-3xl font-bold">
                    {formatValue(breakdown[highlightLine.key], highlightLine.format)}
                  </p>
                </div>
              ) : null}

              {detailLines.length > 0 ? (
                <div className="space-y-2.5">
                  {detailLines.map((line) => {
                    const value = breakdown[line.key];
                    if (value === undefined) return null;
                    if (value === 0) {
                      return (
                        <p
                          key={line.key}
                          className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-400 dark:bg-gray-800/60"
                        >
                          {line.label} — {formatValue(0, line.format)}
                        </p>
                      );
                    }
                    const barWidth = Math.min(100, (Math.abs(value) / maxDetailValue) * 100);
                    return (
                      <div key={line.key}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-300">{line.label}</span>
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            {formatValue(value, line.format)}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                          <div
                            className="h-full rounded-full bg-indigo-400 dark:bg-indigo-500"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

          {output !== null && !error && !hasBreakdownConfig ? (
            <div className="mt-3 rounded-xl bg-indigo-600 px-4 py-4 text-center text-white">
              <p className="text-xs font-medium uppercase tracking-wide text-indigo-100">
                {result?.label ?? "Result"}
              </p>
              <p className="mt-1 text-3xl font-bold">{formatOutput(output)}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
