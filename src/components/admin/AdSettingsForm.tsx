"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { groupedAdPlacements, type AdSettings, type AdNetwork } from "@/lib/ad-settings";

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

  const enabledCount = Object.values(values).filter((c) => c?.enabled).length;

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      {groupedAdPlacements().map(({ group, placements }) => (
        <div key={group}>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
            {group}
          </h2>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {placements.map((def) => {
              const config = values[def.key] ?? { enabled: false, network: "adsterra" as AdNetwork, code: "" };
              return (
                <section
                  key={def.key}
                  className={`rounded-2xl border bg-white p-5 shadow-sm transition-colors dark:bg-gray-900 ${
                    config.enabled
                      ? "border-indigo-200 dark:border-indigo-900"
                      : "border-gray-200 dark:border-gray-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                            config.enabled ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-700"
                          }`}
                        />
                        <h3 className="font-semibold">{def.label}</h3>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                        {def.description}
                      </p>
                    </div>

                    <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={config.enabled}
                        onChange={(e) => updatePlacement(def.key, { enabled: e.target.checked })}
                        className="peer sr-only"
                      />
                      <div className="h-6 w-11 rounded-full bg-gray-200 transition-colors peer-checked:bg-indigo-600 dark:bg-gray-700" />
                      <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
                    </label>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <select
                      className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium dark:border-gray-700 dark:bg-gray-800"
                      value={config.network}
                      onChange={(e) => updatePlacement(def.key, { network: e.target.value as AdNetwork })}
                    >
                      {Object.entries(NETWORK_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <textarea
                    rows={4}
                    spellCheck={false}
                    className="mt-3 w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700 focus:bg-white dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300 dark:focus:bg-gray-900"
                    placeholder="Paste the ad code for this placement..."
                    value={config.code}
                    onChange={(e) => updatePlacement(def.key, { code: e.target.value })}
                  />
                </section>
              );
            })}
          </div>
        </div>
      ))}

      <div className="sticky bottom-0 flex items-center gap-4 rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Ad Settings"}
        </button>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {enabledCount} of {Object.keys(values).length} placements enabled
        </span>
        {error ? <span className="text-sm text-red-600">{error}</span> : null}
        {saved ? <span className="text-sm text-green-600">Saved.</span> : null}
      </div>
    </form>
  );
}
