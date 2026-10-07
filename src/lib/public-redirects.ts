import { prisma } from "@/lib/prisma";
import { loadCategoryIndex, type CategoryIndex } from "@/lib/category-index";
import { calculatorsUrl, pageUrl } from "@/lib/urls";

// Decides whether a public URL must 301 somewhere, and where. Used by
// src/proxy.ts on every public request. Always returns the FINAL URL in one
// step (never a URL that would redirect again), so there are no chains:
//
//   1. Old URL formats → the new structure (src/lib/urls.ts):
//        /tools, /tools/                 → /calculators/
//        /tools/category/{...}/{slug}    → that category's URL
//        /tools/{slug}                   → that calculator's URL
//        /pages/{slug}                   → /{slug}/
//        /calculators/{slug}             → the calculator's URL, if it has a category
//   2. Rows in the `redirects` table (renamed or moved pages; written when a
//      slug or category changes in admin). "/old/*" rows move a whole
//      main category.
//   3. A real category or calculator asked for at a path that isn't its
//      current URL (e.g. after it moved, or the old /{main}/{calculator}/
//      form) → its current URL.
//   4. Uppercase or no trailing slash → lowercase with a trailing slash.

type RedirectRow = { fromPath: string; toPath: string };

// The redirects table is small and rarely changes; keep it in memory for a minute.
let tableCache: { at: number; exact: Map<string, string>; prefix: RedirectRow[] } | null = null;
const TABLE_TTL_MS = 60_000;

async function redirectTable() {
  if (!tableCache || Date.now() - tableCache.at > TABLE_TTL_MS) {
    const rows = await prisma.redirect.findMany({ select: { fromPath: true, toPath: true } });
    tableCache = {
      at: Date.now(),
      exact: new Map(rows.filter((r) => !r.fromPath.endsWith("/*")).map((r) => [r.fromPath, r.toPath])),
      prefix: rows.filter((r) => r.fromPath.endsWith("/*")),
    };
  }
  return tableCache;
}

// Category tree + published calculators (slug → category), also kept for a
// minute, so every category/calculator page view doesn't hit the database.
let catalogCache: { at: number; index: CategoryIndex; tools: Map<string, string | null> } | null = null;

async function catalog() {
  if (!catalogCache || Date.now() - catalogCache.at > TABLE_TTL_MS) {
    const [index, tools] = await Promise.all([
      loadCategoryIndex(),
      prisma.tool.findMany({ where: { status: "published" }, select: { slug: true, categoryId: true } }),
    ]);
    catalogCache = { at: Date.now(), index, tools: new Map(tools.map((t) => [t.slug, t.categoryId])) };
  }
  return catalogCache;
}

/** Rule 3: /{main}/…/{slug} where {slug} is a real item living at a different URL. */
async function catalogTarget(segments: string[]): Promise<string | null> {
  const { index, tools } = await catalog();
  const main = index.bySlug.get(segments[0]);
  if (!main || main.parentId) return null;
  const path = `/${segments.join("/")}/`;
  const slug = segments[segments.length - 1];
  const category = index.bySlug.get(slug);
  const href = category
    ? index.categoryHref(category.id)
    : tools.has(slug)
      ? index.toolHref({ slug, categoryId: tools.get(slug) ?? null })
      : null;
  return href && href !== path ? href : null;
}

/** Forget the cached redirects table (call after writing to it). */
export function clearRedirectCache() {
  tableCache = null;
  catalogCache = null;
}

/** "/Finance/Loan/" → "/finance/loan" — the form stored in the redirects table. */
export function redirectKey(path: string) {
  const clean = path.toLowerCase().replace(/\/+$/, "");
  return clean === "" ? "/" : clean;
}

/**
 * Where an OLD slug lives now, from the redirects table: a stored row whose
 * old URL ended in this slug (a renamed sub-category or calculator), or a
 * "/old/*" row for a renamed main category. Lets old /tools/... URLs follow
 * renames made after the move to the new URL structure.
 */
async function slugHistoryTarget(slug: string): Promise<string | null> {
  const table = await redirectTable();
  const lastSegment = (path: string) => path.split("/").filter(Boolean).pop();
  for (const [from, to] of table.exact) if (lastSegment(from) === slug) return to;
  for (const row of table.prefix) {
    const base = row.fromPath.slice(0, -2);
    if (lastSegment(base) === slug) return `${row.toPath.slice(0, -2)}/`;
  }
  return null;
}

async function legacyTarget(segments: string[]): Promise<string | null> {
  const [first, second, ...rest] = segments;

  if (first === "tools") {
    if (!second) return calculatorsUrl();
    const index = await loadCategoryIndex();
    if (second === "category") {
      const slug = [...rest].pop();
      if (!slug) return null;
      const category = index.bySlug.get(slug);
      return category ? index.categoryHref(category.id) : slugHistoryTarget(slug);
    }
    const tool = await prisma.tool.findUnique({ where: { slug: second }, select: { slug: true, categoryId: true, status: true } });
    if (tool) return tool.status === "published" ? index.toolHref(tool) : null;
    return slugHistoryTarget(second);
  }

  if (first === "pages" && second) {
    const page = await prisma.page.findUnique({ where: { slug: second }, select: { slug: true } });
    return page ? pageUrl(page.slug) : null;
  }

  if (first === "calculators" && second && rest.length === 0) {
    const tool = await prisma.tool.findUnique({ where: { slug: second }, select: { slug: true, categoryId: true, status: true } });
    if (tool?.categoryId && tool.status === "published") {
      return (await loadCategoryIndex()).toolHref(tool);
    }
  }
  return null;
}

/** One redirect step for `pathname`, or null when it is already the right URL. */
async function stepTarget(pathname: string): Promise<string | null> {
  const lower = pathname.toLowerCase();
  const segments = lower.split("/").filter(Boolean);

  let target: string | null = null;
  if (segments[0] === "tools" || segments[0] === "pages" || segments[0] === "calculators") {
    target = await legacyTarget(segments);
  }
  if (!target && segments.length >= 2 && segments.length <= 4) {
    target = await catalogTarget(segments);
  }
  if (!target && segments.length > 0) {
    const table = await redirectTable();
    const key = redirectKey(lower);
    target = table.exact.get(key) ?? null;
    if (!target) {
      for (const row of table.prefix) {
        const base = row.fromPath.slice(0, -2); // drop "/*"
        if (key === base || key.startsWith(base + "/")) {
          target = row.toPath.slice(0, -2) + key.slice(base.length) + "/";
          break;
        }
      }
    }
  }
  // An old /tools/ or /pages/ URL that matches nothing: let it 404 as it is
  // rather than redirecting once more first.
  if (!target && (segments[0] === "tools" || segments[0] === "pages")) return null;
  if (!target) target = lower.endsWith("/") ? lower : `${lower}/`;
  return target === pathname ? null : target;
}

/**
 * The URL `pathname` should 301 to, or null when it is already the right
 * URL. Follows every step (old format → renamed slug → moved item …) to the
 * end, so a visitor always gets ONE redirect straight to the final URL.
 */
export async function publicRedirectTarget(pathname: string): Promise<string | null> {
  let target = await stepTarget(pathname);
  for (let hops = 0; target && hops < 5; hops++) {
    const next = await stepTarget(target);
    if (!next || next === target) break;
    target = next;
  }
  return target;
}
