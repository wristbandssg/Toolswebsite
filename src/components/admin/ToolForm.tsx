"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CalcInputField, CalcResultConfig } from "@/lib/calc-engine";
import { TOOL_TEMPLATES } from "@/lib/templates/registry";

export interface ToolFormValues {
  slug: string;
  title: string;
  description: string;
  templateKey: string;
  categoryId: string;
  status: "draft" | "in_review" | "published" | "needs_update";
  calcType: "expression" | "custom";
  calcFormula: string;
  calcInputs: CalcInputField[];
  calcResult: CalcResultConfig;
  instructions: string;
  examples: string;
  faq: { question: string; answer: string }[];
}

const EMPTY: ToolFormValues = {
  slug: "",
  title: "",
  description: "",
  templateKey: "tool-template-1",
  categoryId: "",
  status: "draft",
  calcType: "expression",
  calcFormula: "",
  calcInputs: [],
  calcResult: { label: "Result", unit: "", format: "number" },
  instructions: "",
  examples: "",
  faq: [],
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

export default function ToolForm({
  mode,
  initial,
  categories,
}: {
  mode: "create" | "edit";
  initial?: Partial<ToolFormValues>;
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<ToolFormValues>({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");

  function update<K extends keyof ToolFormValues>(key: K, val: ToolFormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  function addField() {
    update("calcInputs", [
      ...values.calcInputs,
      { key: "", label: "", type: "number", required: true },
    ]);
  }

  function updateField(i: number, patch: Partial<CalcInputField>) {
    const next = [...values.calcInputs];
    next[i] = { ...next[i], ...patch };
    update("calcInputs", next);
  }

  function removeField(i: number) {
    update(
      "calcInputs",
      values.calcInputs.filter((_, idx) => idx !== i)
    );
  }

  function addFaq() {
    update("faq", [...values.faq, { question: "", answer: "" }]);
  }

  function updateFaq(i: number, patch: Partial<{ question: string; answer: string }>) {
    const next = [...values.faq];
    next[i] = { ...next[i], ...patch };
    update("faq", next);
  }

  function removeFaq(i: number) {
    update(
      "faq",
      values.faq.filter((_, idx) => idx !== i)
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...values,
        calcFormula: values.calcType === "expression" ? values.calcFormula : null,
      };
      const res = await fetch(
        mode === "create" ? "/api/tools" : `/api/tools/${values.slug}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save the tool.");
        return;
      }
      router.push("/admin/tools");
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-8">
      {/* Basic Info */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-4 font-semibold">Basic Info</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="font-medium">Tool Name</span>
            <input
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              value={values.title}
              onChange={(e) => {
                update("title", e.target.value);
                if (!slugTouched) update("slug", slugify(e.target.value));
              }}
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">Slug / URL</span>
            <input
              required
              disabled={mode === "edit"}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800"
              value={values.slug}
              onChange={(e) => {
                setSlugTouched(true);
                update("slug", slugify(e.target.value));
              }}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="font-medium">Short Description</span>
            <textarea
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              rows={2}
              value={values.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">Status</span>
            <select
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              value={values.status}
              onChange={(e) => update("status", e.target.value as ToolFormValues["status"])}
            >
              <option value="draft">Draft</option>
              <option value="in_review">In Review</option>
              <option value="published">Published</option>
              <option value="needs_update">Needs Update</option>
            </select>
          </label>
        </div>
      </section>

      {/* Template */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-4 font-semibold">Template</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {Object.entries(TOOL_TEMPLATES).map(([key, t]) => (
            <label
              key={key}
              className={`cursor-pointer rounded-xl border p-3 text-sm ${
                values.templateKey === key
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950"
                  : "border-gray-200 dark:border-gray-700"
              }`}
            >
              <input
                type="radio"
                name="templateKey"
                className="mr-2"
                checked={values.templateKey === key}
                onChange={() => update("templateKey", key)}
              />
              {t.name}
            </label>
          ))}
        </div>
      </section>

      {/* Category */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Category</h2>
          <Link
            href="/admin/tools/categories"
            target="_blank"
            className="text-xs font-medium text-indigo-600 hover:underline"
          >
            Manage Categories →
          </Link>
        </div>
        <label className="block max-w-sm text-sm">
          <span className="font-medium">Choose a category</span>
          <select
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
            value={values.categoryId}
            onChange={(e) => update("categoryId", e.target.value)}
          >
            <option value="">-- None --</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      {/* Calculation Logic */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-4 font-semibold">Calculation Logic</h2>
        <label className="text-sm">
          <span className="font-medium">Calc Type</span>
          <select
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
            value={values.calcType}
            onChange={(e) => update("calcType", e.target.value as ToolFormValues["calcType"])}
          >
            <option value="expression">Expression (Formula)</option>
            <option value="custom">Custom Code (Developer)</option>
          </select>
        </label>

        {values.calcType === "expression" ? (
          <label className="mt-4 block text-sm">
            <span className="font-medium">Formula</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono dark:border-gray-700 dark:bg-gray-800"
              placeholder="(part / whole) * 100"
              value={values.calcFormula}
              onChange={(e) => update("calcFormula", e.target.value)}
            />
            <span className="mt-1 block text-xs text-gray-400">
              Write the formula using the Key of the Input Fields below.
            </span>
          </label>
        ) : (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            For Custom Logic, a developer needs to add a function for this
            tool&apos;s slug in the `customCalculators` registry in
            `src/lib/calc-engine.ts`.
          </p>
        )}

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Input Fields</h3>
            <button
              type="button"
              onClick={addField}
              className="text-sm text-indigo-600 hover:underline"
            >
              + Add Field
            </button>
          </div>
          <div className="mt-3 space-y-3">
            {values.calcInputs.map((field, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700 sm:grid-cols-5">
                <input
                  placeholder="key (variable)"
                  className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
                  value={field.key}
                  onChange={(e) => updateField(i, { key: e.target.value })}
                />
                <input
                  placeholder="Label"
                  className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
                  value={field.label}
                  onChange={(e) => updateField(i, { label: e.target.value })}
                />
                <select
                  className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
                  value={field.type}
                  onChange={(e) => updateField(i, { type: e.target.value as CalcInputField["type"] })}
                >
                  <option value="number">Number</option>
                  <option value="percentage">Percentage</option>
                  <option value="currency">Currency</option>
                  <option value="dropdown">Dropdown</option>
                  <option value="date">Date</option>
                  <option value="slider">Slider</option>
                </select>
                <input
                  placeholder="Unit (optional)"
                  className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
                  value={field.unit ?? ""}
                  onChange={(e) => updateField(i, { unit: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => removeField(i)}
                  className="rounded border border-red-200 px-2 py-1 text-sm text-red-600 hover:bg-red-50 dark:border-red-900"
                >
                  Remove
                </button>
              </div>
            ))}
            {values.calcInputs.length === 0 ? (
              <p className="text-sm text-gray-400">No Input Fields yet.</p>
            ) : null}
          </div>
        </div>
      </section>

      {/* Result */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-4 font-semibold">Result Section</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm">
            <span className="font-medium">Label</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              value={values.calcResult.label}
              onChange={(e) => update("calcResult", { ...values.calcResult, label: e.target.value })}
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">Unit</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              value={values.calcResult.unit ?? ""}
              onChange={(e) => update("calcResult", { ...values.calcResult, unit: e.target.value })}
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">Format</span>
            <select
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              value={values.calcResult.format ?? "number"}
              onChange={(e) =>
                update("calcResult", {
                  ...values.calcResult,
                  format: e.target.value as CalcResultConfig["format"],
                })
              }
            >
              <option value="number">Number</option>
              <option value="currency">Currency</option>
              <option value="percentage">Percentage</option>
            </select>
          </label>
        </div>
      </section>

      {/* Content */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-4 font-semibold">Content</h2>
        <label className="block text-sm">
          <span className="font-medium">Instructions</span>
          <textarea
            rows={3}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
            value={values.instructions}
            onChange={(e) => update("instructions", e.target.value)}
          />
        </label>
        <label className="mt-4 block text-sm">
          <span className="font-medium">Examples</span>
          <textarea
            rows={3}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
            value={values.examples}
            onChange={(e) => update("examples", e.target.value)}
          />
        </label>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">FAQ</h3>
            <button type="button" onClick={addFaq} className="text-sm text-indigo-600 hover:underline">
              + Add FAQ
            </button>
          </div>
          <div className="mt-3 space-y-3">
            {values.faq.map((item, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <input
                  placeholder="Question"
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
                  value={item.question}
                  onChange={(e) => updateFaq(i, { question: e.target.value })}
                />
                <textarea
                  placeholder="Answer"
                  rows={2}
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
                  value={item.answer}
                  onChange={(e) => updateFaq(i, { answer: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => removeFaq(i)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? "Saving..." : mode === "create" ? "Create Tool" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
