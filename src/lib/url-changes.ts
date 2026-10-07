import { prisma } from "@/lib/prisma";
import { loadCategoryIndex } from "@/lib/category-index";
import { pageUrl, RESERVED_SLUGS } from "@/lib/urls";
import { clearRedirectCache, redirectKey } from "@/lib/public-redirects";

// Keeps the URL structure (src/lib/urls.ts) safe while the admin edits:
//  - slug rules, so two things never share one URL;
//  - automatic 301s: snapshot every public URL before a change, compare
//    after it, and store a redirect for each URL that moved.

// ---------------------------------------------------------------------------
// Slug rules. Each returns an error message, or null when the slug is fine.

const isReserved = (slug: string) => (RESERVED_SLUGS as readonly string[]).includes(slug);

/**
 * A calculator lives at /{main-category}/{slug}/ and a sub-category at
 * /{main-category}/{slug}/ too, so a calculator may not share a slug with
 * any category.
 */
export async function toolSlugError(slug: string): Promise<string | null> {
  const category = await prisma.toolCategory.findUnique({ where: { slug }, select: { name: true } });
  return category ? `"${slug}" is already the URL of the category "${category.name}". Pick a different slug.` : null;
}

/**
 * Category slugs must not clash with a calculator, and a main category sits
 * at /{slug}/ next to normal pages and the site's own sections.
 */
export async function categorySlugError(slug: string, isMain: boolean): Promise<string | null> {
  if (isReserved(slug)) return `"${slug}" is used by the site itself. Pick a different name.`;
  const tool = await prisma.tool.findUnique({ where: { slug }, select: { title: true } });
  if (tool) return `"${slug}" is already the URL of the calculator "${tool.title}". Pick a different name.`;
  if (isMain) {
    const page = await prisma.page.findUnique({ where: { slug }, select: { title: true } });
    if (page) return `"${slug}" is already the URL of the page "${page.title}". Pick a different name.`;
  }
  return null;
}

/** Normal pages sit at /{slug}/, next to main categories and the site's own sections. */
export async function pageSlugError(slug: string): Promise<string | null> {
  if (isReserved(slug)) return `"${slug}" is used by the site itself. Pick a different slug.`;
  const category = await prisma.toolCategory.findFirst({ where: { slug }, select: { name: true, parentId: true } });
  if (category && !category.parentId) return `"${slug}" is already the URL of the category "${category.name}". Pick a different slug.`;
  return null;
}

// ---------------------------------------------------------------------------
// Automatic redirects.

export type UrlSnapshot = { urls: Map<string, string>; roots: Map<string, string> };

/** Every public URL that depends on slugs or categories: published calculators, categories, pages. */
export async function snapshotPublicUrls(): Promise<UrlSnapshot> {
  const [index, tools, pages] = await Promise.all([
    loadCategoryIndex(),
    prisma.tool.findMany({ where: { status: "published" }, select: { id: true, slug: true, categoryId: true } }),
    prisma.page.findMany({ where: { status: "published" }, select: { id: true, slug: true } }),
  ]);
  const urls = new Map<string, string>();
  const roots = new Map<string, string>();
  for (const c of index.byId.values()) {
    urls.set(`category:${c.id}`, index.categoryHref(c.id));
    if (!c.parentId) roots.set(c.id, c.slug);
  }
  for (const t of tools) urls.set(`tool:${t.id}`, index.toolHref(t));
  for (const p of pages) urls.set(`page:${p.id}`, pageUrl(p.slug));
  return { urls, roots };
}

/**
 * Compares the URLs now with a snapshot taken before a change and stores the
 * 301s the redirect rules can't work out alone. A category or calculator
 * that only MOVED keeps its slug, and src/lib/public-redirects.ts already
 * sends its old path to the new one (rule 3) — so rows are stored only when
 * a slug itself changed, plus one "/old/*" row for a renamed main category. Existing redirects that pointed
 * at a moved URL are updated to the new one (no chains), and redirects whose
 * old URL is live again are removed (no loops).
 */
export async function recordUrlChanges(before: UrlSnapshot) {
  const after = await snapshotPublicUrls();
  const moves: { from: string; to: string }[] = [];

  // Renamed main categories → one prefix row each.
  const prefixMoves: { from: string; to: string }[] = [];
  for (const [id, oldSlug] of before.roots) {
    const newSlug = after.roots.get(id);
    if (newSlug && newSlug !== oldSlug) prefixMoves.push({ from: `/${oldSlug}/`, to: `/${newSlug}/` });
  }
  const coveredByPrefix = (from: string, to: string) =>
    prefixMoves.some((p) => from.startsWith(p.from) && to === p.to + from.slice(p.from.length));

  const lastSegment = (url: string) => url.split("/").filter(Boolean).pop();
  for (const [key, from] of before.urls) {
    const to = after.urls.get(key);
    if (to && to !== from && lastSegment(to) !== lastSegment(from) && !coveredByPrefix(from, to)) moves.push({ from, to });
  }
  if (moves.length === 0 && prefixMoves.length === 0) return;

  const live = new Set([...after.urls.values()].map(redirectKey));
  const writes = [
    ...prefixMoves.map((p) => ({ fromPath: `${redirectKey(p.from)}/*`, toPath: `${redirectKey(p.to)}/*` })),
    ...moves.map((m) => ({ fromPath: redirectKey(m.from), toPath: m.to })),
  ];
  for (const w of writes) {
    if (live.has(w.fromPath)) continue;
    await prisma.redirect.upsert({
      where: { fromPath: w.fromPath },
      create: { fromPath: w.fromPath, toPath: w.toPath, type: "permanent" },
      update: { toPath: w.toPath },
    });
  }
  // Older redirects that ended at a URL that just moved now go straight to its new place.
  for (const m of moves) {
    await prisma.redirect.updateMany({ where: { toPath: m.from }, data: { toPath: m.to } });
  }
  // A redirect must never hide a page that is live.
  await prisma.redirect.deleteMany({ where: { fromPath: { in: [...live] } } });
  clearRedirectCache();
}

/** Stores one 301 (e.g. a deleted page → its nearest replacement). */
export async function saveRedirect(from: string, to: string) {
  const fromPath = redirectKey(from);
  if (fromPath === redirectKey(to)) return;
  await prisma.redirect.upsert({
    where: { fromPath },
    create: { fromPath, toPath: to, type: "permanent" },
    update: { toPath: to },
  });
  await prisma.redirect.updateMany({ where: { toPath: from }, data: { toPath: to } });
  clearRedirectCache();
}
