// Public URL structure — the ONE place public URLs are built. Every public
// URL is lowercase and ends with a slash:
//
//   /                          home
//   /{page}/                   normal page (about-us, privacy-policy…)
//   /{category}/               main (top-level) category
//   /{category}/{sub}/         any sub-category, at any depth, under its main category
//   /{category}/{calculator}/        calculator filed directly in a main category
//   /{category}/{sub}/{calculator}/  calculator filed in a sub-category: its
//                                    category's URL + its own slug
//   /blog/  /blog/{post}/  /blog/category/{slug}/
//   /calculators/  /authors/{slug}/
//
// Old /tools/..., /tools/category/... and /pages/... URLs 301 to these in
// src/proxy.ts. Client-safe: no server imports here.

/** First path segments the site uses itself — no category or page may take these slugs. */
export const RESERVED_SLUGS = [
  "admin",
  "api",
  "authors",
  "blog",
  "calculators",
  "pages",
  "tools",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
] as const;

export const homeUrl = () => "/";
export const calculatorsUrl = () => "/calculators/";
export const blogIndexUrl = () => "/blog/";
export const blogUrl = (slug: string) => `/blog/${slug}/`;
export const blogCategoryUrl = (slug: string) => `/blog/category/${slug}/`;
export const authorUrl = (slug: string) => `/authors/${slug}/`;
export const pageUrl = (slug: string) => `/${slug}/`;

/** A category's URL: `/{slug}/` for a main category, `/{rootSlug}/{slug}/` for any sub-category. */
export function categoryUrl(slug: string, rootSlug: string | null | undefined) {
  return rootSlug && rootSlug !== slug ? `/${rootSlug}/${slug}/` : `/${slug}/`;
}

/** A calculator's URL: the URL of the category it is filed in, plus its own slug. */
export function toolUrl(slug: string, categoryHref: string) {
  return `${categoryHref}${slug}/`;
}
