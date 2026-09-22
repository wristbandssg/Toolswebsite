"use client";

import { useState } from "react";
import type { MenuItem, MenuLocation } from "@/lib/menu/types";

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

function emptyItem(): MenuItem {
  return { id: newId(), label: "", href: "", children: [] };
}

function mapTree(items: MenuItem[], id: string, fn: (item: MenuItem) => MenuItem): MenuItem[] {
  return items.map((item) => {
    if (item.id === id) return fn(item);
    if (item.children.length > 0) return { ...item, children: mapTree(item.children, id, fn) };
    return item;
  });
}

function removeFromTree(items: MenuItem[], id: string): MenuItem[] {
  return items
    .filter((item) => item.id !== id)
    .map((item) => ({ ...item, children: removeFromTree(item.children, id) }));
}

function addChildInTree(items: MenuItem[], parentId: string): MenuItem[] {
  return items.map((item) => {
    if (item.id === parentId) return { ...item, children: [...item.children, emptyItem()] };
    return { ...item, children: addChildInTree(item.children, parentId) };
  });
}

function moveInTree(items: MenuItem[], id: string, dir: -1 | 1): MenuItem[] {
  const index = items.findIndex((i) => i.id === id);
  if (index !== -1) {
    const target = index + dir;
    if (target < 0 || target >= items.length) return items;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  }
  return items.map((item) => ({ ...item, children: moveInTree(item.children, id, dir) }));
}

const LEVEL_LABELS = ["Top-level item", "Sub-item", "Link"];

function MenuItemRow({
  item,
  depth,
  onChange,
  onRemove,
  onAddChild,
  onMove,
  maxDepth,
}: {
  item: MenuItem;
  depth: number;
  onChange: (id: string, patch: Partial<MenuItem>) => void;
  onRemove: (id: string) => void;
  onAddChild: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  maxDepth: number;
}) {
  return (
    <div className="mt-2" style={{ marginLeft: depth * 24 }}>
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-900">
        <span className="w-24 flex-shrink-0 text-xs text-gray-400">
          {LEVEL_LABELS[Math.min(depth, LEVEL_LABELS.length - 1)]}
        </span>
        <input
          className="w-40 rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
          placeholder="Label"
          value={item.label}
          onChange={(e) => onChange(item.id, { label: e.target.value })}
        />
        <input
          className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
          placeholder="Link URL (e.g. /tools or https://...)"
          value={item.href}
          onChange={(e) => onChange(item.id, { href: e.target.value })}
        />
        <div className="flex flex-shrink-0 items-center gap-1.5 text-sm">
          <button
            type="button"
            onClick={() => onMove(item.id, -1)}
            className="text-gray-500 hover:text-gray-900 dark:hover:text-white"
            aria-label="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove(item.id, 1)}
            className="text-gray-500 hover:text-gray-900 dark:hover:text-white"
            aria-label="Move down"
          >
            ↓
          </button>
          {depth < maxDepth - 1 ? (
            <button
              type="button"
              onClick={() => onAddChild(item.id)}
              className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              + Sub-item
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="text-red-600 hover:underline"
          >
            Remove
          </button>
        </div>
      </div>
      {item.children.map((child) => (
        <MenuItemRow
          key={child.id}
          item={child}
          depth={depth + 1}
          onChange={onChange}
          onRemove={onRemove}
          onAddChild={onAddChild}
          onMove={onMove}
          maxDepth={maxDepth}
        />
      ))}
    </div>
  );
}

export default function MenuBuilder({
  location,
  initialItems,
  maxDepth = 3,
}: {
  location: MenuLocation;
  initialItems: MenuItem[];
  maxDepth?: number;
}) {
  const [items, setItems] = useState<MenuItem[]>(initialItems);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function updateItem(id: string, patch: Partial<MenuItem>) {
    setSaved(false);
    setItems((prev) => mapTree(prev, id, (item) => ({ ...item, ...patch })));
  }

  function removeItem(id: string) {
    setSaved(false);
    setItems((prev) => removeFromTree(prev, id));
  }

  function addChild(id: string) {
    setSaved(false);
    setItems((prev) => addChildInTree(prev, id));
  }

  function moveItem(id: string, dir: -1 | 1) {
    setSaved(false);
    setItems((prev) => moveInTree(prev, id, dir));
  }

  function addTopLevelItem() {
    setSaved(false);
    setItems((prev) => [...prev, emptyItem()]);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/menus/${location}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ structure: items }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save the menu.");
        return;
      }
      setSaved(true);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        {items.map((item) => (
          <MenuItemRow
            key={item.id}
            item={item}
            depth={0}
            onChange={updateItem}
            onRemove={removeItem}
            onAddChild={addChild}
            onMove={moveItem}
            maxDepth={maxDepth}
          />
        ))}
        {items.length === 0 ? (
          <p className="text-sm text-gray-400">No items yet. Add one below to get started.</p>
        ) : null}

        <button
          type="button"
          onClick={addTopLevelItem}
          className="mt-4 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          + Add Item
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {saved ? <p className="mt-3 text-sm text-green-600">Saved.</p> : null}

      <div className="mt-4">
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Menu"}
        </button>
      </div>
    </div>
  );
}
