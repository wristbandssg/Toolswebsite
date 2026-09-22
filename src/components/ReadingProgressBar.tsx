"use client";

import { useEffect, useState } from "react";

/**
 * A thin, fixed progress bar pinned to the very top of the viewport that
 * fills as the reader scrolls through the post — a small, premium touch
 * common on top-tier editorial blogs (neither of the two reference sites
 * checked for this redesign had one, so this is an original addition on
 * top of them). Pure `position: fixed` overlay — it never affects layout,
 * so it's safe on every screen size without any extra responsive rules.
 */
export default function ReadingProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function handleScroll() {
      const doc = document.documentElement;
      const scrollTop = doc.scrollTop || document.body.scrollTop;
      const scrollHeight = (doc.scrollHeight || document.body.scrollHeight) - doc.clientHeight;
      const pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      setProgress(Math.min(100, Math.max(0, pct)));
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  return (
    <div className="fixed inset-x-0 top-0 z-50 h-1 bg-transparent">
      <div
        className="h-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
