"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import RichTextEditor from "./RichTextEditor";
import SocialIcon from "@/components/site/SocialIcon";
import { AUTHOR_SOCIAL_PLATFORMS, type AuthorSocialLink, type AuthorSocialPlatform } from "@/lib/author-social";

export interface AuthorFormValues {
  id: string; // empty until created
  name: string;
  slug: string;
  jobTitle: string;
  photo: string;
  shortBio: string;
  bio: string;
  expertise: string; // comma-separated in the form, array on submit
  socialLinks: AuthorSocialLink[];
  isDefault: boolean;
}

const EMPTY: AuthorFormValues = {
  id: "",
  name: "",
  slug: "",
  jobTitle: "",
  photo: "",
  shortBio: "",
  bio: "",
  expertise: "",
  socialLinks: [],
  isDefault: false,
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

const input =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800";
const card = "rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900";

export default function AuthorForm({ mode, initial }: { mode: "create" | "edit"; initial?: Partial<AuthorFormValues> }) {
  const router = useRouter();
  const [values, setValues] = useState<AuthorFormValues>({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function update<K extends keyof AuthorFormValues>(key: K, val: AuthorFormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  /** New link row — the first platform not used yet, or a custom link. */
  function addLink(platform?: AuthorSocialPlatform) {
    setValues((v) => {
      const used = new Set(v.socialLinks.map((l) => l.platform));
      const next =
        platform ?? AUTHOR_SOCIAL_PLATFORMS.find((p) => p.key !== "custom" && !used.has(p.key))?.key ?? "custom";
      return { ...v, socialLinks: [...v.socialLinks, { platform: next, url: "", label: "" }] };
    });
  }

  function updateLink(i: number, patch: Partial<AuthorSocialLink>) {
    setValues((v) => ({
      ...v,
      socialLinks: v.socialLinks.map((l, idx) => (idx === i ? { ...l, ...patch } : l)),
    }));
  }

  function moveLink(i: number, dir: -1 | 1) {
    setValues((v) => {
      const list = [...v.socialLinks];
      [list[i], list[i + dir]] = [list[i + dir], list[i]];
      return { ...v, socialLinks: list };
    });
  }

  function removeLink(i: number) {
    setValues((v) => ({ ...v, socialLinks: v.socialLinks.filter((_, idx) => idx !== i) }));
  }

  async function handlePhotoUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/media/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Photo upload failed.");
        return;
      }
      update("photo", data.media.url as string);
    } catch {
      setError("Network error while uploading the photo.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { id, expertise, ...rest } = values;
      const payload = {
        ...rest,
        expertise: expertise
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };
      const res = await fetch(mode === "create" ? "/api/authors" : `/api/authors/${id}`, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save the author.");
        return;
      }
      router.push("/admin/authors");
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
        `Delete "${values.name}"? Their blog posts and calculators will show the default author instead. This can't be undone.`
      )
    ) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/authors/${values.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not delete the author.");
        return;
      }
      router.push("/admin/authors");
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-6xl">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="min-w-0 space-y-6">
          <section className={card}>
            <h2 className="mb-4 font-semibold">Basic Info</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className="font-medium">Full Name</span>
                <input
                  required
                  className={input}
                  value={values.name}
                  onChange={(e) => {
                    update("name", e.target.value);
                    if (!slugTouched) update("slug", slugify(e.target.value));
                  }}
                />
              </label>
              <label className="text-sm">
                <span className="font-medium">Slug / URL</span>
                <input
                  required
                  className={input}
                  value={values.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    update("slug", slugify(e.target.value));
                  }}
                />
                <span className="mt-1 block text-xs text-gray-500">Profile page: /authors/{values.slug || "…"}</span>
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="font-medium">Job Title / Role</span>
                <input
                  className={input}
                  placeholder="e.g. Certified Financial Planner"
                  value={values.jobTitle}
                  onChange={(e) => update("jobTitle", e.target.value)}
                />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="font-medium">Short Bio</span>
                <textarea
                  rows={3}
                  maxLength={400}
                  className={input}
                  placeholder="2–3 sentences. Shown in the author box under blog posts and calculators."
                  value={values.shortBio}
                  onChange={(e) => update("shortBio", e.target.value)}
                />
                <span className="mt-1 block text-right text-xs text-gray-400">{values.shortBio.length}/400</span>
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="font-medium">Areas of Expertise</span>
                <input
                  className={input}
                  placeholder="Comma separated, e.g. Personal Finance, Tax, Mortgages"
                  value={values.expertise}
                  onChange={(e) => update("expertise", e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className={card}>
            <h2 className="mb-1 font-semibold">Full Bio</h2>
            <p className="mb-4 text-sm text-gray-500">
              The &quot;About&quot; section on the author&apos;s profile page — experience, qualifications,
              background.
            </p>
            <RichTextEditor value={values.bio} onChange={(html) => update("bio", html)} />
          </section>

          <section className={card}>
            <h2 className="mb-1 font-semibold">Social Links</h2>
            <p className="mb-4 text-sm text-gray-500">
              Add as many as you like, in the order they should appear. Pick &quot;Custom link&quot; for anything
              not in the list and give it your own name.
            </p>

            {values.socialLinks.length > 0 ? (
              <ul className="space-y-3">
                {values.socialLinks.map((link, i) => {
                  const platform = AUTHOR_SOCIAL_PLATFORMS.find((p) => p.key === link.platform);
                  const isCustom = link.platform === "custom";
                  return (
                    <li
                      key={i}
                      className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 p-2 dark:border-gray-700 sm:flex-nowrap"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        <SocialIcon platform={link.platform} className="h-4 w-4" />
                      </span>
                      <select
                        aria-label="Platform"
                        className="w-40 shrink-0 rounded-lg border border-gray-300 px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                        value={link.platform}
                        onChange={(e) => updateLink(i, { platform: e.target.value as AuthorSocialPlatform })}
                      >
                        {AUTHOR_SOCIAL_PLATFORMS.map((p) => (
                          <option key={p.key} value={p.key}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                      {isCustom ? (
                        <input
                          aria-label="Link name"
                          required
                          maxLength={40}
                          className="w-36 shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                          placeholder="Name, e.g. My Book"
                          value={link.label ?? ""}
                          onChange={(e) => updateLink(i, { label: e.target.value })}
                        />
                      ) : null}
                      <input
                        aria-label="URL"
                        required
                        type={link.platform === "email" ? "email" : "text"}
                        className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                        placeholder={platform?.placeholder}
                        value={link.url}
                        onChange={(e) => updateLink(i, { url: e.target.value })}
                      />
                      <div className="flex shrink-0 items-center">
                        <button
                          type="button"
                          title="Move up"
                          disabled={i === 0}
                          onClick={() => moveLink(i, -1)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 dark:hover:bg-gray-800"
                        >
                          <ArrowUp aria-hidden className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Move down"
                          disabled={i === values.socialLinks.length - 1}
                          onClick={() => moveLink(i, 1)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 dark:hover:bg-gray-800"
                        >
                          <ArrowDown aria-hidden className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Remove"
                          onClick={() => removeLink(i)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                        >
                          <X aria-hidden className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-gray-300 p-4 text-center text-sm text-gray-400 dark:border-gray-700">
                No links yet.
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => addLink()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <Plus aria-hidden className="h-4 w-4" /> Add Link
              </button>
              <button
                type="button"
                onClick={() => addLink("custom")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                <Plus aria-hidden className="h-4 w-4" /> Add Custom Link
              </button>
            </div>
          </section>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        {/* Sidebar */}
        <div className="space-y-6 lg:sticky lg:top-6 lg:h-fit">
          <section className={card}>
            <h2 className="mb-4 font-semibold">Publish</h2>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-gray-300"
                checked={values.isDefault}
                onChange={(e) => update("isDefault", e.target.checked)}
              />
              <span>
                <span className="font-medium">Default author</span>
                <span className="block text-xs text-gray-500">
                  Shown on every blog post and calculator that has no author picked.
                </span>
              </span>
            </label>
            <button
              type="submit"
              disabled={saving}
              className="mt-4 w-full rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : mode === "create" ? "Create Author" : "Save Changes"}
            </button>
            {mode === "edit" ? (
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="mt-2 w-full rounded-lg border border-red-200 px-5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:hover:bg-red-950/40"
              >
                {deleting ? "Deleting..." : "Delete Author"}
              </button>
            ) : null}
          </section>

          <section className={card}>
            <h2 className="mb-4 font-semibold">Photo</h2>
            <div className="space-y-3">
              <div className="flex justify-center">
                {values.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={values.photo}
                    alt=""
                    className="h-28 w-28 rounded-full border border-gray-200 object-cover dark:border-gray-700"
                  />
                ) : (
                  <span className="flex h-28 w-28 items-center justify-center rounded-full bg-gray-100 text-sm text-gray-400 dark:bg-gray-800">
                    No photo
                  </span>
                )}
              </div>
              <input
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                placeholder="https://... (paste an image URL)"
                value={values.photo}
                onChange={(e) => update("photo", e.target.value)}
              />
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoUpload(file);
                  }}
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  {uploading ? "Uploading..." : "Upload Photo"}
                </button>
                {values.photo ? (
                  <button type="button" onClick={() => update("photo", "")} className="text-sm text-red-600 hover:underline">
                    Remove
                  </button>
                ) : null}
              </div>
              <p className="text-xs text-gray-500">A square photo works best.</p>
            </div>
          </section>
        </div>
      </div>
    </form>
  );
}
