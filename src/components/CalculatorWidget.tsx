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

/**
 * Shared, reusable calculator UI (see plan doc, Section 7: "Reusable Input
 * Components"). Every Tool Template renders this same widget — only the
 * surrounding page layout differs between templates. The actual math runs
 * server-side via /api/tools/[id]/calculate so the formula never has to be
 * shipped to the browser.
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

  const hasBreakdownConfig = Boolean(results && results.length > 0);

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
      if (!res.ok) {
        setError(data.error ?? "হিসাব করতে সমস্যা হয়েছে।");
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
      setError("নেটওয়ার্ক সমস্যা — আবার চেষ্টা করুন।");
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

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
      <form onSubmit={handleCalculate} className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <label key={field.key} className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-200">
              {field.label}
              {field.unit ? <span className="text-gray-400"> ({field.unit})</span> : null}
            </span>
            {field.type === "dropdown" && field.options ? (
              <select
                className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                value={values[field.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                required={field.required !== false}
              >
                <option value="" disabled>
                  বাছাই করুন
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
                className="rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                value={values[field.key] ?? ""}
                min={field.min}
                max={field.max}
                required={field.required !== false}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              />
            )}
          </label>
        ))}
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60 sm:w-auto"
          >
            {loading ? "হিসাব হচ্ছে..." : "Calculate"}
          </button>
        </div>
      </form>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {breakdown && !error && results ? (
        <div className="mt-4 overflow-hidden rounded-lg border border-indigo-100 dark:border-indigo-900">
          {results.map((line) => {
            const value = breakdown[line.key];
            if (value === undefined) return null;
            return (
              <div
                key={line.key}
                className={`flex items-center justify-between gap-3 px-4 py-3 ${
                  line.highlight
                    ? "bg-indigo-600 text-white"
                    : "border-t border-indigo-100 bg-indigo-50/60 text-gray-700 first:border-t-0 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-gray-300"
                }`}
              >
                <span className={`text-sm ${line.highlight ? "font-medium" : ""}`}>{line.label}</span>
                <span className={line.highlight ? "text-xl font-bold" : "font-semibold"}>
                  {formatValue(value, line.format)}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}

      {output !== null && !error && !hasBreakdownConfig ? (
        <div className="mt-4 rounded-lg bg-indigo-50 px-4 py-3 dark:bg-indigo-950">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {result?.label ?? "Result"}
          </p>
          <p className="text-2xl font-semibold text-indigo-700 dark:text-indigo-300">
            {formatOutput(output)}
          </p>
        </div>
      ) : null}
    </div>
  );
}
