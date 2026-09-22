"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export interface MediaItem {
  id: string;
  url: string;
  altText: string | null;
  createdAt: string;
}

function MediaCard({
  item,
  onDelete,
  onSaveAlt,
  busy,
}: {
  item: MediaItem;
  onDelete: (id: string) => void;
  onSaveAlt: (id: string, altText: string) => void;
  busy: boolean;
}) {
  const [altText, setAltText] = useState(item.altText ?? "");
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be blocked in some contexts — silently ignore.
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.url} alt={item.altText ?? ""} className="h-32 w-full object-cover" />
      <div className="space-y-2 p-3">
        <input
          className="w-full rounded-lg border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
          placeholder="Alt text"
          value={altText}
          onChange={(e) => setAltText(e.target.value)}
          onBlur={() => {
            if (altText !== (item.altText ?? "")) onSaveAlt(item.id, altText);
          }}
        />
        <p className="text-[11px] text-gray-400">
          {new Date(item.createdAt).toLocaleDateString()}
        </p>
        <div className="flex items-center gap-2 text-xs">
          <button type="button" onClick={handleCopy} className="text-indigo-600 hover:underline">
            {copied ? "Copied!" : "Copy URL"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDelete(item.id)}
            className="text-red-600 hover:underline disabled:opacity-60"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MediaLibraryGrid({ initial }: { initial: MediaItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/media/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed.");
        return;
      }
      setItems((prev) => [data.media, ...prev]);
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this image? This can't be undone.")) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Could not delete this image.");
        return;
      }
      setItems((prev) => prev.filter((m) => m.id !== id));
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSaveAlt(id: string, altText: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/media/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ altText }),
      });
      if (res.ok) {
        setItems((prev) => prev.map((m) => (m.id === id ? { ...m, altText } : m)));
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {uploading ? "Uploading..." : "Upload Image"}
        </button>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </div>

      {items.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              onDelete={handleDelete}
              onSaveAlt={handleSaveAlt}
              busy={busyId === item.id}
            />
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-gray-400">
          No images uploaded yet. Click &quot;Upload Image&quot; above, or upload one while
          editing a Blog Post or Page.
        </p>
      )}
    </div>
  );
}
