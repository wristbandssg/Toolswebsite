"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CalcInputField, CalcResultConfig, CalcResultLineConfig } from "@/lib/calc-engine";
import { TOOL_TEMPLATES } from "@/lib/templates/registry";
import CalculatorWidget from "@/components/CalculatorWidget";
import RichTextEditor from "./RichTextEditor";

export interface ToolFormValues {
  slug: string;
  title: string;
  description: string;
  templateKey: string;
  categoryId: string;
  status: "draft" | "in_review" | "published" | "needs_update";
  // Shows a "POPULAR" badge on this tool's card on its category page.
  isPopular: boolean;
  calcType: "expression" | "custom";
  calcFormula: string;
  calcInputs: CalcInputField[];
  calcResult: CalcResultConfig;
  // Multi-line breakdown result — when non-empty, this is shown on the
  // public page instead of the single calcResult above (e.g. a paycheck
  // calculator showing gross pay / federal tax / FICA / net pay together).
  calcResults: CalcResultLineConfig[];
  instructions: string;
  examples: string;
  // Limitations/disclaimer text — rendered as its own "Assumptions"
  // accordion on the public page, right after "About This Calculator"
  // (instructions). Optional, like Examples/FAQ.
  assumptions: string;
  faq: { question: string; answer: string }[];
  // SEO — meta title/description, canonical URL, schema type, and indexing
  // for this tool's own public page. Edited right here (and saved together
  // with everything else by the same Save button) instead of routing out to
  // the separate SEO Manager page, the same inline approach Tool Categories
  // uses.
  seo: {
    metaTitle: string;
    metaDescription: string;
    canonicalUrl: string;
    robotsIndex: boolean;
    schemaType: string;
  };
}

const EMPTY: ToolFormValues = {
  slug: "",
  title: "",
  description: "",
  templateKey: "tool-template-1",
  categoryId: "",
  status: "draft",
  isPopular: false,
  calcType: "expression",
  calcFormula: "",
  calcInputs: [],
  calcResult: { label: "Result", unit: "", format: "number" },
  calcResults: [],
  instructions: "",
  examples: "",
  assumptions: "",
  faq: [],
  seo: {
    metaTitle: "",
    metaDescription: "",
    canonicalUrl: "",
    robotsIndex: true,
    schemaType: "",
  },
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
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  // The slug this tool was loaded under — captured once and never updated
  // by typing, unlike `values.slug`. In edit mode the PUT request has to go
  // to the OLD slug's URL (to find the row) while the request body carries
  // whatever `values.slug` has been changed to; using `values.slug` for
  // both would 404 the moment the admin edits the URL field.
  const [originalSlug] = useState(initial?.slug ?? "");

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

  function addResultLine() {
    update("calcResults", [
      ...values.calcResults,
      { key: "", label: "", format: "number", highlight: values.calcResults.length === 0 },
    ]);
  }

  function updateResultLine(i: number, patch: Partial<CalcResultLineConfig>) {
    const next = [...values.calcResults];
    next[i] = { ...next[i], ...patch };
    update("calcResults", next);
  }

  function removeResultLine(i: number) {
    update(
      "calcResults",
      values.calcResults.filter((_, idx) => idx !== i)
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
        mode === "create" ? "/api/tools" : `/api/tools/${originalSlug}`,
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

  async function handleDelete() {
    if (
      !window.confirm(
        `Delete "${values.title || originalSlug}"? This permanently removes the tool and its content — this can't be undone.`
      )
    ) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/tools/${originalSlug}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not delete the tool.");
        return;
      }
      router.push("/admin/tools");
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
    <form onSubmit={handleSubmit} className="space-y-8">
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
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              value={values.slug}
              onChange={(e) => {
                setSlugTouched(true);
                update("slug", slugify(e.target.value));
              }}
            />
            {mode === "edit" && values.slug !== originalSlug ? (
              <span className="mt-1 block text-xs text-amber-600 dark:text-amber-400">
                Changing this changes the live URL (/tools/{values.slug}) — old links to /tools/{originalSlug} will
                stop working after you save.
              </span>
            ) : null}
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
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300"
              checked={values.isPopular}
              onChange={(e) => update("isPopular", e.target.checked)}
            />
            <span className="font-medium">Show &quot;Popular&quot; badge on its card</span>
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
        <p className="mt-3 text-xs text-gray-400">
          Used when no Breakdown Lines are added below. Leave the Breakdown empty for a normal
          single-number calculator.
        </p>

        <div className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Breakdown (multiple results, optional)</h3>
              <p className="mt-1 text-xs text-gray-400">
                For a calculator that should show several numbers at once (e.g. gross pay,
                federal tax, FICA, and net pay all together) instead of one result. Each line&apos;s
                Key must match a field name the Custom Calculator returns. Adding any line here
                overrides the single Result Section above on the public page.
              </p>
            </div>
            <button
              type="button"
              onClick={addResultLine}
              className="shrink-0 text-sm text-indigo-600 hover:underline"
            >
              + Add Line
            </button>
          </div>
          <div className="mt-3 space-y-3">
            {values.calcResults.map((line, i) => (
              <div
                key={i}
                className="grid grid-cols-2 gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700 sm:grid-cols-6"
              >
                <input
                  placeholder="key (returned by calculator)"
                  className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800 sm:col-span-2"
                  value={line.key}
                  onChange={(e) => updateResultLine(i, { key: e.target.value })}
                />
                <input
                  placeholder="Label"
                  className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
                  value={line.label}
                  onChange={(e) => updateResultLine(i, { label: e.target.value })}
                />
                <select
                  className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
                  value={line.format ?? "number"}
                  onChange={(e) =>
                    updateResultLine(i, { format: e.target.value as CalcResultLineConfig["format"] })
                  }
                >
                  <option value="number">Number</option>
                  <option value="currency">Currency</option>
                  <option value="percentage">Percentage</option>
                </select>
                <label className="flex items-center gap-1.5 text-xs text-gray-500">
                  <input
                    type="checkbox"
                    checked={line.highlight ?? false}
                    onChange={(e) => updateResultLine(i, { highlight: e.target.checked })}
                  />
                  Highlight
                </label>
                <button
                  type="button"
                  onClick={() => removeResultLine(i)}
                  className="rounded border border-red-200 px-2 py-1 text-sm text-red-600 hover:bg-red-50 dark:border-red-900"
                >
                  Remove
                </button>
              </div>
            ))}
            {values.calcResults.length === 0 ? (
              <p className="text-sm text-gray-400">No breakdown lines — using the single Result above.</p>
            ) : null}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-4 font-semibold">Content</h2>
        <div className="block text-sm">
          <span className="font-medium">Instructions</span>
          <span className="ml-1 text-xs text-gray-400">
            (shown as the &quot;About This Calculator&quot; dropdown — same rich text editor as Blog posts, so you
            can add links and images here too)
          </span>
          <div className="mt-1">
            <RichTextEditor
              value={values.instructions}
              onChange={(html) => update("instructions", html)}
            />
          </div>
        </div>
        <div className="mt-4 block text-sm">
          <span className="font-medium">Assumptions</span>
          <span className="ml-1 text-xs text-gray-400">
            (shown as its own always-visible &quot;Assumptions&quot; section, after the Example section — optional)
          </span>
          <div className="mt-1">
            <RichTextEditor
              value={values.assumptions}
              onChange={(html) => update("assumptions", html)}
            />
          </div>
        </div>
        <div className="mt-4 block text-sm">
          <span className="font-medium">Examples</span>
          <div className="mt-1">
            <RichTextEditor value={values.examples} onChange={(html) => update("examples", html)} />
          </div>
        </div>

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

      {/* SEO — inline, saved together with the rest of the tool by the Save
          button below. No separate page to visit. */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="font-semibold">SEO</h2>
        <p className="mt-1 text-xs text-gray-400">
          Meta title, description, canonical URL, and indexing for this tool&apos;s own page —
          saved with the rest of the tool, no separate SEO page needed.
        </p>
        <div className="mt-4 space-y-4">
          <label className="block text-sm">
            <span className="font-medium">Meta Title</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              placeholder={values.title || "Tool Name"}
              value={values.seo.metaTitle}
              onChange={(e) => update("seo", { ...values.seo, metaTitle: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Meta Description</span>
            <textarea
              rows={2}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              placeholder={values.description || undefined}
              value={values.seo.metaDescription}
              onChange={(e) => update("seo", { ...values.seo, metaDescription: e.target.value })}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium">Canonical URL</span>
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                placeholder={values.slug ? `/tools/${values.slug}` : ""}
                value={values.seo.canonicalUrl}
                onChange={(e) => update("seo", { ...values.seo, canonicalUrl: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Schema.org Type</span>
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                placeholder="WebApplication"
                value={values.seo.schemaType}
                onChange={(e) => update("seo", { ...values.seo, schemaType: e.target.value })}
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300"
              checked={values.seo.robotsIndex}
              onChange={(e) => update("seo", { ...values.seo, robotsIndex: e.target.checked })}
            />
            <span className="font-medium">Allow search engines to index this tool&apos;s page</span>
          </label>
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? "Saving..." : mode === "create" ? "Create Tool" : "Save Changes"}
        </button>
        {mode === "edit" ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || saving}
            className="rounded-lg border border-red-300 px-5 py-2.5 font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:hover:bg-red-950/40"
          >
            {deleting ? "Deleting..." : "Delete Tool"}
          </button>
        ) : null}
      </div>
    </form>

      {/* Live Preview — kept outside the <form> above (a <form> can't
          contain another <form>, and CalculatorWidget renders its own).
          Sticky on large screens so it stays in view while editing. */}
      <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            <h2 className="font-semibold">Live Preview</h2>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            A rough look at how visitors will see this tool.
          </p>

          <div className="mt-4 space-y-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {values.title || "Untitled Tool"}
              </p>
              {values.isPopular ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  Popular
                </span>
              ) : null}
            </div>
            {values.description ? (
              <p className="text-sm text-gray-500">{values.description}</p>
            ) : null}
          </div>

          <div className="mt-4">
            {values.calcInputs.length > 0 ? (
              <CalculatorWidget
                toolSlug={values.slug || "preview"}
                fields={values.calcInputs}
                result={values.calcResult}
                results={values.calcResults}
              />
            ) : (
              <p className="rounded-lg border border-dashed border-gray-300 px-3 py-6 text-center text-sm text-gray-400 dark:border-gray-700">
                Add Input Fields below to preview the calculator.
              </p>
            )}
          </div>

          {values.calcInputs.length > 0 ? (
            <p className="mt-3 text-xs text-gray-400">
              Clicking Calculate here runs against the last <span className="font-medium">saved</span>{" "}
              version of this tool — save your changes first to test the latest logic.
            </p>
          ) : null}
        </div>

        {values.instructions || values.assumptions || values.examples || values.faq.length > 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm dark:border-gray-800 dark:bg-gray-900">
            <h3 className="font-semibold">Content Preview</h3>
            <dl className="mt-3 space-y-2 text-gray-500">
              <div className="flex justify-between">
                <dt>Instructions (About This Calculator)</dt>
                <dd>{values.instructions ? `${values.instructions.length} chars` : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Assumptions</dt>
                <dd>{values.assumptions ? `${values.assumptions.length} chars` : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Examples</dt>
                <dd>{values.examples ? `${values.examples.length} chars` : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt>FAQ items</dt>
                <dd>{values.faq.length}</dd>
              </div>
            </dl>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
