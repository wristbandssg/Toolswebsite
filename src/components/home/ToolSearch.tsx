"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronRight, Search } from "lucide-react";

/** Home page search box — queries /api/search as you type (debounced); Enter opens the first match. */
export default function ToolSearch({ placeholder = "Search calculators…" }: { placeholder?: string }) {
  const router = useRouter();
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

  const showDropdown = open && query.trim().length >= 2;

  return (
    <form
      role="search"
      className="relative"
      onSubmit={(e) => {
        e.preventDefault();
        if (results[0]) router.push(`/tools/${results[0].slug}`);
      }}
    >
      <Search aria-hidden className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-sky-500" />
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        aria-label="Search calculators"
        className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-14 pr-5 text-base shadow-lg shadow-slate-200/60 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-900 dark:shadow-none dark:focus:ring-sky-900/40"
      />
      {showDropdown ? (
        <div className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 text-left shadow-2xl dark:border-slate-800 dark:bg-slate-900">
          {results.length > 0 ? (
            results.map((r) => (
              <Link
                key={r.slug}
                href={`/tools/${r.slug}`}
                className="group flex items-center justify-between gap-2 rounded-xl px-4 py-2.5 text-sm text-slate-700 hover:bg-sky-50 hover:text-sky-800 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <span className="truncate">{r.title}</span>
                <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-sky-600" />
              </Link>
            ))
          ) : (
            <p className="px-4 py-3 text-sm text-slate-400">No calculators found.</p>
          )}
        </div>
      ) : null}
    </form>
  );
}
