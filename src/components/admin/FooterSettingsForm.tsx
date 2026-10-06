"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SOCIAL_PLATFORMS, type FooterSettings } from "@/lib/footer-config";

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800";
const smallButton =
  "rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800";

type ColorKey = "bgFrom" | "bgTo" | "textColor" | "headingColor" | "linkColor" | "bottomBg" | "bottomTextColor";

const COLOR_FIELDS: { key: ColorKey; label: string }[] = [
  { key: "bgFrom", label: "Background (Left)" },
  { key: "bgTo", label: "Background (Right)" },
  { key: "headingColor", label: "Headings & Brand" },
  { key: "textColor", label: "Text" },
  { key: "linkColor", label: "Links" },
  { key: "bottomBg", label: "Copyright Bar Background" },
  { key: "bottomTextColor", label: "Copyright Bar Text" },
];

/** Footer colors, brand column, social links and copyright (the link columns are the menu below). */
export default function FooterSettingsForm({ initial, siteName }: { initial: FooterSettings; siteName: string }) {
  const router = useRouter();
  const [values, setValues] = useState<FooterSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FooterSettings>(key: K, value: FooterSettings[K]) {
    setSaved(false);
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/footer-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save the footer settings.");
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

  const preview = `linear-gradient(110deg, ${values.bgFrom}, ${values.bgTo})`;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 xl:col-span-2 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="font-semibold">Colors</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
          {COLOR_FIELDS.map((field) => (
            <label key={field.key} className="block text-sm">
              <span className="font-medium">{field.label}</span>
              <span className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  value={values[field.key]}
                  onChange={(e) => update(field.key, e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-gray-300 dark:border-gray-700"
                />
                <input
                  className="w-full rounded-lg border border-gray-300 px-2 py-1.5 font-mono text-xs dark:border-gray-700 dark:bg-gray-800"
                  value={values[field.key]}
                  onChange={(e) => update(field.key, e.target.value)}
                />
              </span>
            </label>
          ))}
        </div>
        {/* Live preview strip */}
        <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 text-sm dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-6 px-5 py-4" style={{ background: preview, color: values.textColor }}>
            <span className="text-base font-bold" style={{ color: values.headingColor }}>
              {values.brandName || siteName}
            </span>
            <span>Tagline text</span>
            <span style={{ color: values.linkColor }} className="underline">
              A footer link
            </span>
          </div>
          <div className="px-5 py-2 text-center text-xs" style={{ background: values.bottomBg, color: values.bottomTextColor }}>
            Copyright bar
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="font-semibold">Brand Column</h2>
        <div className="mt-4 space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={values.showBrand} onChange={(e) => update("showBrand", e.target.checked)} />
            Show the brand column (logo, name, tagline, social icons)
          </label>
          <label className="block text-sm">
            <span className="font-medium">Name</span>
            <input className={inputClass} value={values.brandName} placeholder={siteName} onChange={(e) => update("brandName", e.target.value)} />
            <span className="mt-1 block text-xs text-gray-400">Leave empty to use the site name. The logo comes from Website Settings.</span>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Tagline</span>
            <textarea className={inputClass} rows={2} value={values.tagline} onChange={(e) => update("tagline", e.target.value)} />
          </label>
          <div className="text-sm">
            <span className="font-medium">Social Links</span>
            <div className="mt-2 space-y-2">
              {values.socials.map((social, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[180px_1fr_auto]">
                  <select
                    className={inputClass}
                    value={social.platform}
                    onChange={(e) => update("socials", values.socials.map((s, j) => (j === i ? { ...s, platform: e.target.value } : s)))}
                  >
                    {SOCIAL_PLATFORMS.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className={inputClass}
                    placeholder={social.platform === "email" ? "you@example.com" : "https://…"}
                    value={social.url}
                    onChange={(e) => update("socials", values.socials.map((s, j) => (j === i ? { ...s, url: e.target.value } : s)))}
                  />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className={smallButton}
                      disabled={i === 0}
                      onClick={() => {
                        const next = [...values.socials];
                        [next[i - 1], next[i]] = [next[i], next[i - 1]];
                        update("socials", next);
                      }}
                    >
                      ↑
                    </button>
                    <button type="button" className={`${smallButton} text-red-600`} onClick={() => update("socials", values.socials.filter((_, j) => j !== i))}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className={`${smallButton} mt-2`}
              onClick={() => update("socials", [...values.socials, { platform: "facebook", url: "" }])}
            >
              + Add Social Link
            </button>
          </div>
        </div>
      </section>

      <section className="h-fit rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="font-semibold">Copyright Bar</h2>
        <label className="mt-4 block text-sm">
          <span className="font-medium">Text</span>
          <input className={inputClass} value={values.copyright} onChange={(e) => update("copyright", e.target.value)} />
          <span className="mt-1 block text-xs text-gray-400">
            Use {"{year}"} for the current year and {"{siteName}"} for the site name. Leave empty to hide the bar.
          </span>
        </label>
      </section>

      <div className="flex items-center gap-3 xl:col-span-2">
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Footer Style & Text"}
        </button>
        {saved ? <span className="text-sm text-green-600">Saved.</span> : null}
        {error ? <span className="text-sm text-red-600">{error}</span> : null}
      </div>
    </div>
  );
}
