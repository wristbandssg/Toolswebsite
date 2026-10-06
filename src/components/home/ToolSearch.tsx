"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";

/** Home page search box — queries /api/search as you type (debounced). */
export default function ToolSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ slug: string; title: string }[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (res.ok) setResults((await res.json()).results ?? []);
      } catch {
        // Aborted or offline — keep the previous results.
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="relative">
      <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search calculators, e.g. mortgage, BMI, tax…"
        aria-label="Search calculators"
        className="w-full rounded-xl border border-gray-200 bg-white py-3.5 pl-12 pr-4 text-sm shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-900 dark:focus:ring-indigo-900/40"
      />
      {open && query.trim().length >= 2 ? (
        <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-xl dark:border-gray-800 dark:bg-gray-900">
          {results.length > 0 ? (
            results.map((r) => (
              <Link
                key={r.slug}
                href={`/tools/${r.slug}`}
                className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                {r.title}
              </Link>
            ))
          ) : (
            <p className="px-4 py-3 text-sm text-gray-400">No calculators found.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
