"use client";

import { useEffect, useRef, useState } from "react";
import type { D2Blog } from "@/lib/homepage-data";
import BlogCard from "./BlogCard";

/**
 * Blog cards in a swipeable slider: 1 card on phones, 2 on tablets, 3 on
 * desktop. Arrows and dots move it; with `autoplay` it advances every 5
 * seconds (pausing while hovered or focused, and never for visitors who
 * prefer reduced motion). Built on CSS scroll-snap, so touch swiping works
 * natively and every card link is in the HTML.
 */
export default function BlogSlider({ blogs, buttonText, autoplay }: { blogs: D2Blog[]; buttonText: string; autoplay: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const [active, setActive] = useState(0);
  const [stops, setStops] = useState(blogs.length);

  function geometry() {
    const track = trackRef.current;
    const first = track?.firstElementChild as HTMLElement | null;
    if (!track || !first) return null;
    const step = first.offsetWidth + parseFloat(getComputedStyle(track).columnGap || "0");
    const perView = Math.max(1, Math.round((track.clientWidth + 1) / step));
    return { track, step, stops: Math.max(1, blogs.length - perView + 1) };
  }

  function goTo(index: number) {
    const g = geometry();
    if (!g) return;
    const target = ((index % g.stops) + g.stops) % g.stops;
    g.track.scrollTo({ left: target * g.step, behavior: "smooth" });
  }

  // Keep the dots in step with the track size (also after resizes).
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(() => {
      const g = geometry();
      if (g) setStops(g.stops);
    });
    observer.observe(track);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blogs.length]);

  useEffect(() => {
    if (!autoplay || stops <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      if (!pausedRef.current) goTo(active + 1);
    }, 5000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplay, stops, active]);

  const arrow =
    "absolute top-[28%] z-10 hidden h-11 w-11 items-center justify-center rounded-full bg-white text-xl text-blue-800 shadow-lg ring-1 ring-gray-200 transition hover:scale-105 hover:bg-blue-50 disabled:opacity-0 md:flex dark:bg-gray-900 dark:text-blue-300 dark:ring-gray-700";

  return (
    <div
      className="relative"
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
      onFocus={() => (pausedRef.current = true)}
      onBlur={() => (pausedRef.current = false)}
    >
      <div
        ref={trackRef}
        onScroll={(e) => {
          const g = geometry();
          if (g) setActive(Math.min(g.stops - 1, Math.round(e.currentTarget.scrollLeft / g.step)));
        }}
        className="-mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-4 pb-4 pt-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {blogs.map((blog) => (
          <div
            key={blog.slug}
            className="w-[85%] shrink-0 snap-start sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)]"
          >
            <BlogCard blog={blog} buttonText={buttonText} />
          </div>
        ))}
      </div>

      {stops > 1 ? (
        <>
          <button type="button" aria-label="Previous posts" onClick={() => goTo(active - 1)} className={`${arrow} -left-5`}>
            ‹
          </button>
          <button type="button" aria-label="Next posts" onClick={() => goTo(active + 1)} className={`${arrow} -right-5`}>
            ›
          </button>
          <div className="mt-4 flex justify-center gap-2">
            {Array.from({ length: stops }, (_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === active}
                onClick={() => goTo(i)}
                className={`h-2.5 rounded-full transition-all ${
                  i === active ? "w-7 bg-blue-700 dark:bg-blue-400" : "w-2.5 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700"
                }`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
