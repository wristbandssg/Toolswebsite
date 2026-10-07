// One-time move to the new public URL structure (src/lib/urls.ts):
//   /tools/category/{x} → /{main}/ or /{main}/{x}/
//   /tools/{calculator} → /{main}/{calculator}/
//   /pages/{page}       → /{page}/
// and a trailing slash on every public URL.
//
// 1. Renames the one category whose slug clashed with a calculator
//    ("interest-rate-calculator"), keeping a 301 from its old URL.
// 2. Rewrites every internal link stored in the database (menus, blog posts,
//    calculator text, category articles, page sections, site settings,
//    author bios) to its final new URL — the same answer the live redirects
//    give, so no link goes through a redirect.
//
// Run AFTER the new code is live:   npx tsx prisma/migrate-url-structure.ts
// Preview without writing anything: npx tsx prisma/migrate-url-structure.ts --dry-run
import { PrismaClient } from "@prisma/client";
import { publicRedirectTarget, clearRedirectCache } from "../src/lib/public-redirects";

const prisma = new PrismaClient();
const DRY = process.argv.includes("--dry-run");

// Links written with the full site address are made relative, so they work
// on every host (live, local) and never leave the site.
const OWN_HOSTS = /^https?:\/\/(?:www\.)?(?:toolswebsite\.onrender\.com|localhost:3000)(?=\/)/i;

// A quoted internal URL: "…", '…' or \"…\" (inside stored JSON), either
// relative ("/x") or on our own host.
const QUOTED_URL =
  /(\\?["'])((?:https?:\/\/(?:www\.)?(?:toolswebsite\.onrender\.com|localhost:3000))?\/(?!\/)[^"'\\\s<>]*)\1/gi;

const stats = { linksChanged: 0, fieldsChanged: 0, examples: new Map<string, string>() };

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

async function rewriteText(text: string | null | undefined): Promise<string | null> {
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

/** Rewrites the given text fields of every row; writes only rows that changed. */
async function migrate<T extends { id: string }>(
  label: string,
  rows: T[],
  fields: (keyof T & string)[],
  save: (id: string, data: Partial<Record<string, string>>) => Promise<unknown>
) {
  let rowsChanged = 0;
  for (const row of rows) {
    const data: Partial<Record<string, string>> = {};
    for (const field of fields) {
      const next = await rewriteText(row[field] as unknown as string | null);
      if (next !== null) data[field] = next;
    }
    if (Object.keys(data).length > 0) {
      rowsChanged++;
      stats.fieldsChanged += Object.keys(data).length;
      if (!DRY) await save(row.id, data);
    }
  }
  console.log(`  ${label}: ${rowsChanged} of ${rows.length} changed`);
}

async function renameClashingCategory() {
  const OLD = "interest-rate-calculator";
  const NEW = "interest-rate-calculators";
  const category = await prisma.toolCategory.findUnique({ where: { slug: OLD } });
  const tool = await prisma.tool.findUnique({ where: { slug: OLD }, select: { id: true } });
  if (!category || !tool) {
    console.log("1. Category/calculator slug clash: none left.");
    return;
  }
  console.log(`1. Renaming category "${category.name}" (${OLD}) → "Interest Rate Calculators" (${NEW}).`);
  if (DRY) return;
  await prisma.toolCategory.update({ where: { id: category.id }, data: { slug: NEW, name: "Interest Rate Calculators" } });
  // Its old URL, /tools/category/interest-rate-calculator, would otherwise find nothing.
  const parent = category.parentId ? await prisma.toolCategory.findUnique({ where: { id: category.parentId } }) : null;
  const toPath = parent ? `/${parent.slug}/${NEW}/` : `/${NEW}/`;
  await prisma.redirect.upsert({
    where: { fromPath: `/tools/category/${OLD}` },
    create: { fromPath: `/tools/category/${OLD}`, toPath, type: "permanent" },
    update: { toPath },
  });
  clearRedirectCache();
}

async function main() {
  console.log(DRY ? "DRY RUN — nothing is written.\n" : "Migrating…\n");
  await renameClashingCategory();

  console.log("2. Rewriting stored links:");
  await migrate("Menus", await prisma.menu.findMany(), ["structure"], (id, data) =>
    prisma.menu.update({ where: { id }, data })
  );
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

  console.log(`\n${stats.linksChanged} links in ${stats.fieldsChanged} fields ${DRY ? "would change" : "changed"}. Examples:`);
  for (const [from, to] of stats.examples) console.log(`  ${from}  →  ${to}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
