import { prisma } from "@/lib/prisma";
import { publicRedirectTarget } from "@/lib/public-redirects";

// Rewrites every internal link stored in the database (menus, blog posts,
// calculator text, category articles, page sections, site settings, author
// bios) to its final current URL — the same answer the live redirects give —
// so no stored link goes through a redirect. Run by the one-time URL
// migration (prisma/migrate-url-structure.ts) and after any admin change
// that moves a URL (src/lib/url-changes.ts).

// Links written with the full site address are made relative, so they work
// on every host (live, local) and never leave the site.
const OWN_HOSTS = /^https?:\/\/(?:www\.)?(?:toolswebsite\.onrender\.com|localhost:3000)(?=\/)/i;

// A quoted internal URL: "…", '…' or \"…\" (inside stored JSON), either
// relative ("/x") or on our own host.
const QUOTED_URL =
  /(\\?["'])((?:https?:\/\/(?:www\.)?(?:toolswebsite\.onrender\.com|localhost:3000))?\/(?!\/)[^"'\\\s<>]*)\1/gi;

export interface RewriteStats {
  linksChanged: number;
  fieldsChanged: number;
  examples: Map<string, string>;
  perModel: { label: string; changed: number; total: number }[];
}

async function rewriteUrl(url: string): Promise<string> {
  const relative = url.replace(OWN_HOSTS, "");
  const match = relative.match(/^([^?#]*)(.*)$/)!;
  const path = match[1];
  const rest = match[2];
  const last = path.split("/").filter(Boolean).pop() ?? "";
  if (/^\/(api|_next|admin)(\/|$)/.test(path) || last.includes(".")) return relative === url ? url : relative;
  const target = await publicRedirectTarget(path);
  return (target ?? path) + rest;
}

async function rewriteText(text: string | null | undefined, stats: RewriteStats): Promise<string | null> {
  if (!text) return null;
  const found = [...text.matchAll(QUOTED_URL)];
  if (found.length === 0) return null;
  let out = "";
  let at = 0;
  let changed = false;
  for (const m of found) {
    const [whole, quote, url] = m;
    const next = await rewriteUrl(url);
    out += text.slice(at, m.index) + (next === url ? whole : `${quote}${next}${quote}`);
    at = m.index! + whole.length;
    if (next !== url) {
      changed = true;
      stats.linksChanged++;
      if (stats.examples.size < 25) stats.examples.set(url, next);
    }
  }
  out += text.slice(at);
  return changed ? out : null;
}

export async function rewriteStoredLinks({ dryRun = false } = {}): Promise<RewriteStats> {
  const stats: RewriteStats = { linksChanged: 0, fieldsChanged: 0, examples: new Map(), perModel: [] };

  async function migrate<T extends { id: string }>(
    label: string,
    rows: T[],
    fields: (keyof T & string)[],
    save: (id: string, data: Partial<Record<string, string>>) => Promise<unknown>
  ) {
    let changed = 0;
    for (const row of rows) {
      const data: Partial<Record<string, string>> = {};
      for (const field of fields) {
        const next = await rewriteText(row[field] as unknown as string | null, stats);
        if (next !== null) data[field] = next;
      }
      if (Object.keys(data).length > 0) {
        changed++;
        stats.fieldsChanged += Object.keys(data).length;
        if (!dryRun) await save(row.id, data);
      }
    }
    stats.perModel.push({ label, changed, total: rows.length });
  }

  await migrate("Menus", await prisma.menu.findMany(), ["structure"], (id, data) => prisma.menu.update({ where: { id }, data }));
  await migrate(
    "Blog posts",
    await prisma.blog.findMany({ select: { id: true, content: true, excerpt: true } }),
    ["content", "excerpt"],
    (id, data) => prisma.blog.update({ where: { id }, data })
  );
  await migrate(
    "Calculators",
    await prisma.tool.findMany({ select: { id: true, instructions: true, examples: true, assumptions: true, faq: true, description: true } }),
    ["instructions", "examples", "assumptions", "faq", "description"],
    (id, data) => prisma.tool.update({ where: { id }, data })
  );
  await migrate(
    "Calculator categories",
    await prisma.toolCategory.findMany({ select: { id: true, content: true, heroDescription: true } }),
    ["content", "heroDescription"],
    (id, data) => prisma.toolCategory.update({ where: { id }, data })
  );
  await migrate(
    "Blog categories",
    await prisma.blogCategory.findMany({ select: { id: true, content: true, description: true } }),
    ["content", "description"],
    (id, data) => prisma.blogCategory.update({ where: { id }, data })
  );
  await migrate("Pages", await prisma.page.findMany({ select: { id: true, sections: true } }), ["sections"], (id, data) =>
    prisma.page.update({ where: { id }, data })
  );
  await migrate("Authors", await prisma.author.findMany({ select: { id: true, bio: true } }), ["bio"], (id, data) =>
    prisma.author.update({ where: { id }, data })
  );
  // Site settings use the setting key as their id.
  const settings = (await prisma.siteSetting.findMany()).map((s) => ({ id: s.key, value: s.value }));
  await migrate("Site settings (home page, footer, …)", settings, ["value"], (id, data) =>
    prisma.siteSetting.update({ where: { key: id }, data })
  );
  return stats;
}
