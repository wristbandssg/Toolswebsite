"use client";

import { useEffect, useRef, useState } from "react";
import type { TocHeading } from "@/lib/toc";

/**
 * Sticky, scroll-spy Table of Contents. Only lists a post's top-level (H2)
 * sections — sub-headings (H3) are deliberately left out of the caller's
 * `headings` prop so the list stays short and scannable, matching a demo
 * site the user pointed to (plain list, top-level sections only, no box
 * around it). Stays fixed in the left column while the reader scrolls, and
 * highlights whichever section is currently in view. Hidden below `lg`.
 */
export default function TableOfContents({ headings }: { headings: TocHeading[] }) {
  const [activeId, setActiveId] = useState<string | null>(headings[0]?.id ?? null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (headings.length === 0) return;

    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    observerRef.current?.disconnect();
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      // Counts a heading as "current" once it's near the top of the
      // viewport, and keeps it current until the next one takes over.
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 }
    );
    elements.forEach((el) => observer.observe(el));
    observerRef.current = observer;

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <aside className="hidden lg:block">
      {/* Plain — no card, no border, no background. Sits directly on the
          page like the demo, not boxed in. */}
      <div className="sticky top-6">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Table of Contents
        </p>
        <nav className="relative space-y-0.5 border-l-2 border-gray-200 dark:border-gray-800">
          {headings.map((h) => {
            const active = h.id === activeId;
            return (
              <a
                key={h.id}
                href={`#${h.id}`}
                className={`-ml-0.5 block border-l-2 py-1.5 pl-4 text-[13px] leading-snug transition-all ${
                  active
                    ? "border-indigo-600 font-semibold text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                    : "border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                }`}
              >
                {h.text}
              </a>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
