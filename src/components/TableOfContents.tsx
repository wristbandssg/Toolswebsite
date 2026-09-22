"use client";

import { useEffect, useRef, useState } from "react";
import type { TocHeading } from "@/lib/toc";

/**
 * Sticky, scroll-spy Table of Contents for a blog post's own H2/H3
 * headings. Stays fixed in the left column while the reader scrolls
 * through the article, and highlights whichever section is currently in
 * view — same interaction as the reference site this was checked against
 * (nextstair.com/alternatives/surfshark-alternatives) before building.
 * Hidden below the `lg` breakpoint, same as the reference.
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
      <div className="sticky top-6">
        <p className="mb-4 text-sm font-bold text-gray-900 dark:text-gray-100">
          Table of Contents
        </p>
        <nav className="space-y-px">
          {headings.map((h) => {
            const active = h.id === activeId;
            return (
              <a
                key={h.id}
                href={`#${h.id}`}
                className={`block border-l-2 py-1.5 text-[13px] leading-snug transition-colors ${
                  h.level === 3 ? "pl-5" : "pl-3"
                } ${
                  active
                    ? "border-indigo-600 font-semibold text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-200"
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
