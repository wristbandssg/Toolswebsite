"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export interface HeroSlide {
  slug: string;
  title: string;
  excerpt: string | null;
  image: string | null;
}

// Same small hash-based palette trick used elsewhere in the admin (category
// swatches, banners) — keeps a post's fallback color stable across renders
// instead of random, for posts that have no featured image.
const GRADIENTS = [
  "from-indigo-600 to-blue-600",
  "from-blue-600 to-indigo-700",
  "from-indigo-700 to-violet-600",
  "from-blue-700 to-indigo-600",
];

function gradientFor(text: string) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return GRADIENTS[hash % GRADIENTS.length];
}

/**
 * Auto-rotating hero slider for a blog category page — a big image/gradient
 * card with the post title, a short excerpt and a "Read More" button, plus
 * dot navigation. Matches the reference layout the user shared (a WordPress
 * "Business Articles" demo): hero slider on the left, a plain featured list
 * on the right, a card grid below.
 */
export default function CategoryHeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => setActive((a) => (a + 1) % slides.length), 6000);
    return () => clearInterval(id);
  }, [slides.length]);

  if (slides.length === 0) return null;

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-lg sm:aspect-auto sm:h-full sm:min-h-[360px]">
      {slides.map((slide, i) => (
        <Link
          key={slide.slug}
          href={`/blog/${slide.slug}`}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === active ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          {slide.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={slide.image} alt={slide.title} className="h-full w-full object-cover" />
          ) : (
            <div className={`h-full w-full bg-gradient-to-br ${gradientFor(slide.title)}`} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-white sm:text-2xl">{slide.title}</h2>
            {slide.excerpt ? (
              <p className="mt-2 line-clamp-2 max-w-md text-sm text-white/85">{slide.excerpt}</p>
            ) : null}
            <span className="mt-4 inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow transition-colors hover:bg-indigo-50">
              Read More
            </span>
          </div>
        </Link>
      ))}

      {slides.length > 1 ? (
        <div className="absolute right-4 top-4 flex gap-1.5 rounded-full bg-black/25 px-2 py-1.5 backdrop-blur-sm">
          {slides.map((slide, i) => (
            <button
              key={slide.slug}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show slide ${i + 1}`}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === active ? "bg-white" : "bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
