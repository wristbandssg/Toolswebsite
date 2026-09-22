"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SiteGeneralSettings } from "@/lib/site-config";

export default function SiteSettingsForm({ initial }: { initial: SiteGeneralSettings }) {
  const router = useRouter();
  const [values, setValues] = useState<SiteGeneralSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function update<K extends keyof SiteGeneralSettings>(key: K, val: SiteGeneralSettings[K]) {
    setSaved(false);
    setValues((v) => ({ ...v, [key]: val }));
  }

  async function handleLogoUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/media/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Logo upload failed.");
        return;
      }
      update("logoUrl", data.media.url as string);
    } catch {
      setError("Network error while uploading the logo.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save settings.");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-4 font-semibold">General</h2>
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="font-medium">Site Name</span>
            <input
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              value={values.siteName}
              onChange={(e) => update("siteName", e.target.value)}
            />
            <span className="mt-1 block text-xs text-gray-400">
              Shown in the site header and as the default page title.
            </span>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Site Description</span>
            <textarea
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              rows={2}
              value={values.siteDescription}
              onChange={(e) => update("siteDescription", e.target.value)}
            />
            <span className="mt-1 block text-xs text-gray-400">
              Used as the default meta description for pages that don&apos;t set their own.
            </span>
          </label>
          <div className="text-sm">
            <span className="font-medium">Logo</span>
            <div className="mt-1 flex items-center gap-3">
              {values.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={values.logoUrl}
                  alt=""
                  className="h-10 w-10 flex-shrink-0 rounded border border-gray-200 object-contain dark:border-gray-700"
                />
              ) : null}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleLogoUpload(file);
                }}
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                {uploading ? "Uploading..." : values.logoUrl ? "Replace Logo" : "Upload Logo"}
              </button>
              {values.logoUrl ? (
                <button
                  type="button"
                  onClick={() => update("logoUrl", "")}
                  className="text-sm text-red-600 hover:underline"
                >
                  Remove
                </button>
              ) : null}
            </div>
            <span className="mt-1 block text-xs text-gray-400">
              Optional — falls back to the site name as text if not set.
            </span>
          </div>
          <label className="block text-sm">
            <span className="font-medium">Contact Email</span>
            <input
              type="email"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              value={values.contactEmail}
              onChange={(e) => update("contactEmail", e.target.value)}
            />
          </label>
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {saved ? <p className="text-sm text-green-600">Saved.</p> : null}

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </form>
  );
}
