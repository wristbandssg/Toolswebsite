/** Shared SEO helpers (Phase 7: SEO Management System). */

import type { Metadata } from "next";

let warned = false;

/** The public site address (NEXTAUTH_URL), used for canonical URLs, the sitemap and structured data. */
export function getSiteUrl() {
  const raw = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  // On the live site a missing or localhost NEXTAUTH_URL would put
  // "localhost" in every canonical URL and the sitemap — say so loudly.
  // (Skipped during `next build`, which also runs in production mode.)
  if (!warned && process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build" && /localhost|127\.0\.0\.1/.test(raw)) {
    warned = true;
    console.warn(`[seo] NEXTAUTH_URL is "${raw}". Set it to the live https address, or canonical URLs and the sitemap will point at localhost.`);
  }
  return raw.trim().replace(/\/+$/, "");
}

export const SEO_CONTENT_TYPES = ["tool", "blog", "page", "category", "tool_category"] as const;
export type SeoContentType = (typeof SEO_CONTENT_TYPES)[number];

interface SeoMetaLike {
  metaTitle?: string | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  ogImage?: string | null;
  robotsIndex?: boolean | null;
}

/** Strips HTML tags from rich text content to build a plain-text meta description fallback. */
export function excerptFromHtml(html: string, maxLength = 160) {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

/** Turns a SeoMeta DB record (or null) into a Next.js Metadata object, with sensible fallbacks. */
export function buildSeoMetadata({
  seoMeta,
  fallbackTitle,
  fallbackDescription,
  path,
}: {
  seoMeta?: SeoMetaLike | null;
  fallbackTitle: string;
  fallbackDescription?: string | null;
  path: string;
}): Metadata {
  const title = seoMeta?.metaTitle || fallbackTitle;
  const description = seoMeta?.metaDescription || fallbackDescription || undefined;
  // A custom canonical that points at an old /tools/ or /pages/ URL would
  // send search engines to a redirect, so it is ignored.
  const override = seoMeta?.canonicalUrl && !/\/(tools|pages)\//.test(seoMeta.canonicalUrl) ? seoMeta.canonicalUrl : "";
  const canonical = override || `${getSiteUrl()}${path}`;
  const robotsIndex = seoMeta?.robotsIndex ?? true;

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: robotsIndex, follow: robotsIndex },
    openGraph: {
      title,
      description,
      url: canonical,
      // A base64 "data:" image can't be fetched by Facebook, X, etc. — pages
      // pass a real URL (src/lib/image-urls.ts); anything else is left out.
      images: seoMeta?.ogImage && !seoMeta.ogImage.startsWith("data:") ? [{ url: seoMeta.ogImage }] : undefined,
    },
  };
}
