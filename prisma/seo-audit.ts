// SEO audit script — checks every PUBLISHED Tool, Blog, and Page for common
// on-page SEO problems: missing/too-short/too-long meta title & description,
// duplicate meta title/description reused across more than one page, missing
// structured-data schemaType (tools), and missing canonical URLs.
//
// Read-only — makes no changes to the database.
//
// This needs a live database connection, so it can't run from an AI's cloud
// sandbox — run it yourself, locally, pointed at your real DATABASE_URL.
//
// See SEO_CHECKLIST.md for what each check means and how to fix it.
//
// HOW TO RUN
//   npx tsx prisma/seo-audit.ts
// or
//   npm run db:seo-audit

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TITLE_MIN = 15;
const TITLE_MAX = 60;
const DESC_MIN = 50;
const DESC_MAX = 160;

type Severity = "error" | "warning";

interface Issue {
  severity: Severity;
  contentType: string;
  slug: string;
  message: string;
}

interface SeoMetaShape {
  metaTitle: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  schemaType: string | null;
}

interface ContentItem {
  contentType: "tool" | "blog" | "page";
  slug: string;
  seoMeta: SeoMetaShape | null;
}

async function main() {
  const issues: Issue[] = [];

  const [tools, blogs, pages] = await Promise.all([
    prisma.tool.findMany({ where: { status: "published" }, include: { seoMeta: true } }),
    prisma.blog.findMany({ where: { status: "published" }, include: { seoMeta: true } }),
    prisma.page.findMany({ where: { status: "published" }, include: { seoMeta: true } }),
  ]);

  const items: ContentItem[] = [
    ...tools.map((t) => ({ contentType: "tool" as const, slug: t.slug, seoMeta: t.seoMeta })),
    ...blogs.map((b) => ({ contentType: "blog" as const, slug: b.slug, seoMeta: b.seoMeta })),
    ...pages.map((p) => ({ contentType: "page" as const, slug: p.slug, seoMeta: p.seoMeta })),
  ];

  const titleMap = new Map<string, ContentItem[]>();
  const descMap = new Map<string, ContentItem[]>();

  for (const item of items) {
    const meta = item.seoMeta;

    if (!meta || !meta.metaTitle || meta.metaTitle.trim() === "") {
      issues.push({ severity: "error", contentType: item.contentType, slug: item.slug, message: "Missing meta title." });
    } else {
      const len = meta.metaTitle.length;
      if (len < TITLE_MIN) {
        issues.push({ severity: "warning", contentType: item.contentType, slug: item.slug, message: `Meta title is short (${len} chars) — aim for ${TITLE_MIN}-${TITLE_MAX}.` });
      }
      if (len > TITLE_MAX) {
        issues.push({ severity: "error", contentType: item.contentType, slug: item.slug, message: `Meta title is too long (${len} chars, max ~${TITLE_MAX}) — Google will truncate it in search results.` });
      }
      const key = meta.metaTitle.trim().toLowerCase();
      titleMap.set(key, [...(titleMap.get(key) ?? []), item]);
    }

    if (!meta || !meta.metaDescription || meta.metaDescription.trim() === "") {
      issues.push({ severity: "error", contentType: item.contentType, slug: item.slug, message: "Missing meta description." });
    } else {
      const len = meta.metaDescription.length;
      if (len < DESC_MIN) {
        issues.push({ severity: "warning", contentType: item.contentType, slug: item.slug, message: `Meta description is short (${len} chars) — aim for ${DESC_MIN}-${DESC_MAX}.` });
      }
      if (len > DESC_MAX) {
        issues.push({ severity: "error", contentType: item.contentType, slug: item.slug, message: `Meta description is too long (${len} chars, max ~${DESC_MAX}) — Google will truncate it in search results.` });
      }
      const key = meta.metaDescription.trim().toLowerCase();
      descMap.set(key, [...(descMap.get(key) ?? []), item]);
    }

    if (item.contentType === "tool" && (!meta || !meta.schemaType)) {
      issues.push({ severity: "warning", contentType: item.contentType, slug: item.slug, message: 'Missing structured data schemaType (expected "SoftwareApplication").' });
    }

    if (!meta || !meta.canonicalUrl) {
      issues.push({ severity: "warning", contentType: item.contentType, slug: item.slug, message: "No canonical URL set (falls back to the page's own URL — fine unless this content is duplicated elsewhere)." });
    }
  }

  for (const [key, group] of titleMap) {
    if (group.length > 1) {
      for (const item of group) {
        issues.push({ severity: "error", contentType: item.contentType, slug: item.slug, message: `Duplicate meta title shared with ${group.length - 1} other page(s): "${key}".` });
      }
    }
  }
  for (const [, group] of descMap) {
    if (group.length > 1) {
      for (const item of group) {
        issues.push({ severity: "error", contentType: item.contentType, slug: item.slug, message: `Duplicate meta description shared with ${group.length - 1} other page(s).` });
      }
    }
  }

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  console.log(
    `\nSEO Audit — ${items.length} published page(s) checked (${tools.length} tools, ${blogs.length} blogs, ${pages.length} pages)\n`
  );

  if (errors.length === 0 && warnings.length === 0) {
    console.log("No SEO issues found.");
  } else {
    if (errors.length > 0) {
      console.log(`ERRORS (${errors.length}) — fix these first:`);
      for (const e of errors) console.log(`  [${e.contentType}] ${e.slug} — ${e.message}`);
      console.log("");
    }
    if (warnings.length > 0) {
      console.log(`WARNINGS (${warnings.length}) — worth reviewing:`);
      for (const w of warnings) console.log(`  [${w.contentType}] ${w.slug} — ${w.message}`);
    }
  }

  console.log(`\nDone. ${errors.length} error(s), ${warnings.length} warning(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
