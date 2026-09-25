"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AD_PLACEMENTS, type AdSettings, type AdNetwork } from "@/lib/ad-settings";

const NETWORK_LABELS: Record<AdNetwork, string> = {
  adsterra: "Adsterra",
  adsense: "Google AdSense",
  other: "Other",
  none: "None",
};

export default function AdSettingsForm({ initial }: { initial: AdSettings }) {
  const router = useRouter();
  const [values, setValues] = useState<AdSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function updatePlacement(key: string, patch: Partial<AdSettings[string]>) {
    setSaved(false);
    setValues((v) => ({ ...v, [key]: { ...v[key], ...patch } }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/ad-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save ad settings.");
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
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      {AD_PLACEMENTS.map((def) => {
        const config = values[def.key] ?? { enabled: false, network: "adsterra" as AdNetwork, code: "" };
        return (
          <section
            key={def.key}
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold">{def.label}</h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{def.description}</p>
              </div>
              <label className="flex shrink-0 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => updatePlacement(def.key, { enabled: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="font-medium">Enabled</span>
              </label>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="font-medium">Ad Network</span>
                <select
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                  value={config.network}
                  onChange={(e) => updatePlacement(def.key, { network: e.target.value as AdNetwork })}
                >
                  {Object.entries(NETWORK_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className="font-medium">Ad Code</span>
                <textarea
                  rows={5}
                  spellCheck={false}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs dark:border-gray-700 dark:bg-gray-800"
                  placeholder="Paste the exact HTML/script snippet your ad network gave you for this placement..."
                  value={config.code}
                  onChange={(e) => updatePlacement(def.key, { code: e.target.value })}
                />
                <span className="mt-1 block text-xs text-gray-400">
                  Pasted verbatim — no need to edit or trim it. Leave this empty (or leave &quot;Enabled&quot;
                  unchecked) and nothing renders here at all, not even empty space.
                </span>
              </label>
            </div>
          </section>
        );
      })}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {saved ? <p className="text-sm text-green-600">Saved.</p> : null}

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save Ad Settings"}
      </button>
    </form>
  );
}
