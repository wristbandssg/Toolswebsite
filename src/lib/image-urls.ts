import { createHash } from "crypto";

// Images uploaded in admin are stored in the database as base64 "data:" text.
// Put straight into a page, that text makes every page that shows the image
// much heavier (the author photo is on every calculator page), can't be cached
// by the browser, and can't be used as a social-share image. So public pages
// link to /media/{kind}/{key}.{ext} instead, which serves the same stored image
// as a normal, cacheable file (src/app/media/[kind]/[file]/route.ts).

const DATA_URI = /^data:(image\/(?:jpeg|png|webp|gif));base64,/;
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

/** Which stored image a /media/ URL points at. */
export const IMAGE_KINDS = ["author", "blog", "blog-share", "site-logo"] as const;
export type ImageKind = (typeof IMAGE_KINDS)[number];

/**
 * The URL to put in a public page for a stored image: unchanged for a normal
 * URL, or a /media/ URL for a base64 one. `?v=` changes when the image does,
 * so browsers can cache each version for a year.
 */
export function publicImageUrl(value: string | null | undefined, kind: ImageKind, key: string): string | null {
  if (!value) return null;
  const m = value.match(DATA_URI);
  if (!m) return value;
  const version = createHash("sha1").update(value).digest("hex").slice(0, 10);
  return `/media/${kind}/${encodeURIComponent(key)}.${EXT[m[1]]}?v=${version}`;
}

/** The site logo (Admin → Settings). */
export const siteLogoUrl = (logoUrl: string) => publicImageUrl(logoUrl, "site-logo", "logo") ?? "";

/** Decodes a stored base64 image; null when the value isn't one. */
export function decodeDataUri(value: string | null | undefined): { type: string; ext: string; body: Buffer } | null {
  const m = value?.match(DATA_URI);
  if (!value || !m) return null;
  return { type: m[1], ext: EXT[m[1]], body: Buffer.from(value.slice(m[0].length), "base64") };
}
