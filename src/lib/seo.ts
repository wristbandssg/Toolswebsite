/** Shared SEO helpers (Phase 7: SEO Management System). */

import type { Metadata } from "next";

export function getSiteUrl() {
  const raw = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

export const SEO_CONTENT_TYPES = ["tool", "blog", "page", "category"] as const;
export type SeoContentType = (typeof SEO_CONTENT_TYPES)[number];

export interface SeoMetaValues {
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  ogImage: string;
  robotsIndex: boolean;
  schemaType: string;
}

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
  const canonical = seoMeta?.canonicalUrl || `${getSiteUrl()}${path}`;
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
      images: seoMeta?.ogImage ? [{ url: seoMeta.ogImage }] : undefined,
    },
  };
}
