"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PageSection } from "@/lib/templates/page/types";

export interface PageSeoValues {
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  robotsIndex: boolean;
  schemaType: string;
}

const EMPTY_SEO: PageSeoValues = {
  metaTitle: "",
  metaDescription: "",
  canonicalUrl: "",
  robotsIndex: true,
  schemaType: "",
};

export interface PageFormValues {
  id: string; // Mongo ObjectId — empty until the page is first created
  slug: string;
  title: string;
  templateKey: string;
  sections: PageSection[];
  status: "draft" | "in_review" | "published" | "needs_update";
  // SEO — meta title/description, canonical URL, schema type, and indexing
  // for this page's own public URL. Edited right here, saved right after
  // the page itself (same two-step save the Blog Post form uses), instead
  // of routing out to the (now removed) separate SEO Manager page.
  seo: PageSeoValues;
}

const EMPTY: PageFormValues = {
  id: "",
  slug: "",
  title: "",
  templateKey: "page-template-1",
  sections: [],
  status: "draft",
  seo: EMPTY_SEO,
};

const SECTION_LABELS: Record<PageSection["type"], string> = {
  heading: "Heading",
  paragraph: "Paragraph",
  image: "Image",
  button: "Button",
  spacer: "Spacer",
  calculator_embed: "Calculator Embed",
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

function defaultSectionFor(type: PageSection["type"]): PageSection {
  switch (type) {
    case "heading":
      return { type: "heading", text: "", level: 2 };
    case "paragraph":
      return { type: "paragraph", text: "" };
    case "image":
      return { type: "image", url: "", alt: "" };
    case "button":
      return { type: "button", label: "", href: "" };
    case "spacer":
      return { type: "spacer", size: "md" };
    case "calculator_embed":
      return { type: "calculator_embed", toolSlug: "", toolTitle: "" };
  }
}

export default function PageBuilder({
  mode,
  initial,
  templates,
  tools,
}: {
  mode: "create" | "edit";
  initial?: Partial<PageFormValues>;
  templates: { key: string; name: string }[];
  tools: { slug: string; title: string }[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<PageFormValues>({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [addType, setAddType] = useState<PageSection["type"]>("heading");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingImageIndex = useRef<number | null>(null);

  function update<K extends keyof PageFormValues>(key: K, val: PageFormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  function updateSeo<K extends keyof PageSeoValues>(key: K, val: PageSeoValues[K]) {
    setValues((v) => ({ ...v, seo: { ...v.seo, [key]: val } }));
  }

  function updateSection(index: number, patch: Partial<PageSection>) {
    setValues((v) => ({
      ...v,
      sections: v.sections.map((s, i) => (i === index ? ({ ...s, ...patch } as PageSection) : s)),
    }));
  }

  function addSection() {
    setValues((v) => ({ ...v, sections: [...v.sections, defaultSectionFor(addType)] }));
  }

  function removeSection(index: number) {
    setValues((v) => ({ ...v, sections: v.sections.filter((_, i) => i !== index) }));
  }

  function moveSection(index: number, dir: -1 | 1) {
    setValues((v) => {
      const next = [...v.sections];
      const target = index + dir;
      if (target < 0 || target >= next.length) return v;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...v, sections: next };
    });
  }

  function openImagePicker(index: number) {
    pendingImageIndex.current = index;
    fileInputRef.current?.click();
  }

  async function handleImageFile(file: File) {
    const index = pendingImageIndex.current;
    if (index === null) return;
    setUploadingIndex(index);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/media/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Image upload failed.");
        return;
      }
      updateSection(index, { url: data.media.url as string } as Partial<PageSection>);
    } catch {
      setError("Network error while uploading the image.");
    } finally {
      setUploadingIndex(null);
      pendingImageIndex.current = null;
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        slug: values.slug,
        title: values.title,
        templateKey: values.templateKey,
        sections: values.sections,
        status: values.status,
      };
      const res = await fetch(mode === "create" ? "/api/pages" : `/api/pages/${values.slug}`, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save the page.");
        return;
      }

      const pageId = data.page?.id as string | undefined;
      if (pageId) {
        try {
          await fetch(`/api/seo/page/${pageId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values.seo),
          });
        } catch {
          // The page itself saved fine — don't block navigation over the SEO
          // sidecar write failing.
        }
      }

      router.push("/admin/pages");
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-8">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageFile(file);
        }}
      />

      {/* Basic Info */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-4 font-semibold">Basic Info</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="font-medium">Title</span>
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
          <label className="text-sm">
            <span className="font-medium">Page Template</span>
            <select
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              value={values.templateKey}
              onChange={(e) => update("templateKey", e.target.value)}
            >
              {templates.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="font-medium">Status</span>
            <select
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              value={values.status}
              onChange={(e) => update("status", e.target.value as PageFormValues["status"])}
            >
              <option value="draft">Draft</option>
              <option value="in_review">In Review</option>
              <option value="published">Published</option>
              <option value="needs_update">Needs Update</option>
            </select>
          </label>
        </div>
      </section>

      {/* Page Builder */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-1 font-semibold">Page Builder</h2>
        <p className="mb-4 text-sm text-gray-500">
          Add sections and arrange them in the order they should appear on the page.
        </p>

        <div className="space-y-4">
          {values.sections.map((section, index) => (
            <div
              key={index}
              className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium dark:bg-gray-800">
                  {SECTION_LABELS[section.type]}
                </span>
                <div className="flex items-center gap-2 text-sm">
                  <button
                    type="button"
                    onClick={() => moveSection(index, -1)}
                    disabled={index === 0}
                    className="text-gray-500 hover:text-gray-900 disabled:opacity-30 dark:hover:text-white"
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSection(index, 1)}
                    disabled={index === values.sections.length - 1}
                    className="text-gray-500 hover:text-gray-900 disabled:opacity-30 dark:hover:text-white"
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSection(index)}
                    className="text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {section.type === "heading" ? (
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <input
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                    placeholder="Heading text"
                    value={section.text}
                    onChange={(e) => updateSection(index, { text: e.target.value })}
                  />
                  <select
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                    value={section.level ?? 2}
                    onChange={(e) =>
                      updateSection(index, { level: Number(e.target.value) as 1 | 2 | 3 })
                    }
                  >
                    <option value={1}>H1</option>
                    <option value={2}>H2</option>
                    <option value={3}>H3</option>
                  </select>
                </div>
              ) : null}

              {section.type === "paragraph" ? (
                <textarea
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                  rows={4}
                  placeholder="Paragraph text"
                  value={section.text}
                  onChange={(e) => updateSection(index, { text: e.target.value })}
                />
              ) : null}

              {section.type === "image" ? (
                <div className="space-y-2">
                  {section.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={section.url}
                      alt=""
                      className="h-32 w-full rounded-lg border border-gray-200 object-cover dark:border-gray-700"
                    />
                  ) : null}
                  <input
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                    placeholder="https://... (paste an image URL)"
                    value={section.url}
                    onChange={(e) => updateSection(index, { url: e.target.value })}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={uploadingIndex === index}
                      onClick={() => openImagePicker(index)}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:hover:bg-gray-800"
                    >
                      {uploadingIndex === index ? "Uploading..." : "Upload Image"}
                    </button>
                  </div>
                  <input
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                    placeholder="Alt text (for accessibility)"
                    value={section.alt ?? ""}
                    onChange={(e) => updateSection(index, { alt: e.target.value })}
                  />
                </div>
              ) : null}

              {section.type === "button" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                    placeholder="Button label"
                    value={section.label}
                    onChange={(e) => updateSection(index, { label: e.target.value })}
                  />
                  <input
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                    placeholder="Link URL (e.g. /tools/loan-calculator)"
                    value={section.href}
                    onChange={(e) => updateSection(index, { href: e.target.value })}
                  />
                </div>
              ) : null}

              {section.type === "spacer" ? (
                <select
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                  value={section.size ?? "md"}
                  onChange={(e) =>
                    updateSection(index, { size: e.target.value as "sm" | "md" | "lg" })
                  }
                >
                  <option value="sm">Small</option>
                  <option value="md">Medium</option>
                  <option value="lg">Large</option>
                </select>
              ) : null}

              {section.type === "calculator_embed" ? (
                <select
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                  value={section.toolSlug}
                  onChange={(e) => {
                    const tool = tools.find((t) => t.slug === e.target.value);
                    updateSection(index, {
                      toolSlug: e.target.value,
                      toolTitle: tool?.title ?? "",
                    });
                  }}
                >
                  <option value="">-- Choose a calculator tool --</option>
                  {tools.map((t) => (
                    <option key={t.slug} value={t.slug}>
                      {t.title}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          ))}

          {values.sections.length === 0 ? (
            <p className="text-sm text-gray-400">
              No sections yet. Add one below to start building this page.
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
          <select
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            value={addType}
            onChange={(e) => setAddType(e.target.value as PageSection["type"])}
          >
            {(Object.keys(SECTION_LABELS) as PageSection["type"][]).map((type) => (
              <option key={type} value={type}>
                {SECTION_LABELS[type]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addSection}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            + Add Section
          </button>
        </div>
      </section>

      {/* SEO — inline, saved right after the page above. No separate SEO
          Manager page to visit. */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-4 font-semibold">SEO</h2>
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="font-medium">Meta Title</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              placeholder={values.title || "Falls back to the page title"}
              value={values.seo.metaTitle}
              onChange={(e) => updateSeo("metaTitle", e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Meta Description</span>
            <textarea
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              value={values.seo.metaDescription}
              onChange={(e) => updateSeo("metaDescription", e.target.value)}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium">Canonical URL</span>
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                placeholder={values.slug ? `/pages/${values.slug}` : "Leave blank to use this page's own URL"}
                value={values.seo.canonicalUrl}
                onChange={(e) => updateSeo("canonicalUrl", e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Schema.org Type</span>
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                placeholder="e.g. WebPage (optional)"
                value={values.seo.schemaType}
                onChange={(e) => updateSeo("schemaType", e.target.value)}
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300"
              checked={values.seo.robotsIndex}
              onChange={(e) => updateSeo("robotsIndex", e.target.checked)}
            />
            <span className="font-medium">Allow search engines to index this page</span>
          </label>
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? "Saving..." : mode === "create" ? "Create Page" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
