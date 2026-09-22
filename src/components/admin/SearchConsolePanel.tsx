"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchConsolePanel({
  currentSiteUrl,
}: {
  currentSiteUrl: string | null;
}) {
  const router = useRouter();
  const [sites, setSites] = useState<{ siteUrl: string; permissionLevel: string }[] | null>(null);
  const [loadingSites, setLoadingSites] = useState(false);
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSites() {
    setLoadingSites(true);
    setError(null);
    try {
      const res = await fetch("/api/gsc/sites");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not load your Search Console properties.");
        return;
      }
      setSites(data.sites);
      if (data.sites.length === 0) {
        setError(
          "No properties found on this Google account. Verify your site in Google Search Console first, then try again."
        );
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoadingSites(false);
    }
  }

  async function chooseSite(siteUrl: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/gsc/site", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save this property.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/gsc/disconnect", { method: "POST" });
      if (!res.ok) {
        setError("Could not disconnect.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="space-y-4">
      {currentSiteUrl ? (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700">
          <span>
            Showing data for <span className="font-medium">{currentSiteUrl}</span>
          </span>
          <button
            type="button"
            onClick={loadSites}
            disabled={loadingSites}
            className="text-indigo-600 hover:underline disabled:opacity-60"
          >
            Change property
          </button>
        </div>
      ) : (
        <div>
          <p className="mb-2 text-sm text-gray-500">
            Connected, but no property selected yet. Choose which Search Console property this
            site maps to.
          </p>
          <button
            type="button"
            onClick={loadSites}
            disabled={loadingSites}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {loadingSites ? "Loading..." : "Choose Property"}
          </button>
        </div>
      )}

      {sites ? (
        <div className="space-y-2">
          {sites.map((site) => (
            <button
              key={site.siteUrl}
              type="button"
              disabled={saving}
              onClick={() => chooseSite(site.siteUrl)}
              className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              {site.siteUrl}{" "}
              <span className="text-xs text-gray-400">({site.permissionLevel})</span>
            </button>
          ))}
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="button"
        onClick={handleDisconnect}
        disabled={disconnecting}
        className="text-sm text-red-600 hover:underline disabled:opacity-60"
      >
        {disconnecting ? "Disconnecting..." : "Disconnect Google Search Console"}
      </button>
    </div>
  );
}
