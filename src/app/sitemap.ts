import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/seo";
import { loadCategoryIndex } from "@/lib/category-index";
import { authorUrl, blogCategoryUrl, blogIndexUrl, blogUrl, calculatorsUrl, pageUrl } from "@/lib/urls";

// Generated fresh on every request so newly published content shows up
// immediately (same reasoning as the force-dynamic pages — the build
// environment can't reach the database). Lists only the current URL of each
// page (src/lib/urls.ts), never an old /tools/ or /pages/ one, and skips
// anything set to noindex.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  const [index, tools, categories, blogs, blogCategories, pages, authors] = await Promise.all([
    loadCategoryIndex(),
    prisma.tool.findMany({
      where: { status: "published" },
      select: { slug: true, categoryId: true, updatedAt: true, seoMeta: { select: { robotsIndex: true } } },
    }),
    prisma.toolCategory.findMany({ select: { id: true, seoMeta: { select: { robotsIndex: true } } } }),
    prisma.blog.findMany({
      where: { status: "published" },
      select: { slug: true, updatedAt: true, seoMeta: { select: { robotsIndex: true } } },
    }),
    prisma.blogCategory.findMany({ select: { slug: true, seoMeta: { select: { robotsIndex: true } } } }),
    prisma.page.findMany({
      where: { status: "published" },
      select: { slug: true, updatedAt: true, seoMeta: { select: { robotsIndex: true } } },
    }),
    prisma.author.findMany({ select: { slug: true, updatedAt: true } }),
  ]);

  const indexable = (item: { seoMeta: { robotsIndex: boolean } | null }) => item.seoMeta?.robotsIndex !== false;
  const abs = (path: string) => `${siteUrl}${path}`;

  // A category page is only worth listing when it has a published calculator
  // somewhere beneath it (empty ones just say "Nothing here yet").
  const liveCategoryIds = new Set<string>();
  for (const tool of tools) {
    if (tool.categoryId) for (const c of index.chainOf(tool.categoryId)) liveCategoryIds.add(c.id);
  }

  const entries: MetadataRoute.Sitemap = [
    { url: abs("/"), lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: abs(calculatorsUrl()), lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: abs(blogIndexUrl()), lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
  ];

  for (const category of categories.filter(indexable)) {
    if (!liveCategoryIds.has(category.id)) continue;
    const isMain = !index.byId.get(category.id)?.parentId;
    entries.push({ url: abs(index.categoryHref(category.id)), changeFrequency: "weekly", priority: isMain ? 0.9 : 0.8 });
  }
  for (const tool of tools.filter(indexable)) {
    entries.push({ url: abs(index.toolHref(tool)), lastModified: tool.updatedAt, changeFrequency: "weekly", priority: 0.9 });
  }
  for (const blog of blogs.filter(indexable)) {
    entries.push({ url: abs(blogUrl(blog.slug)), lastModified: blog.updatedAt, changeFrequency: "monthly", priority: 0.7 });
  }
  for (const category of blogCategories.filter(indexable)) {
    entries.push({ url: abs(blogCategoryUrl(category.slug)), changeFrequency: "weekly", priority: 0.5 });
  }
  for (const page of pages.filter(indexable)) {
    entries.push({ url: abs(pageUrl(page.slug)), lastModified: page.updatedAt, changeFrequency: "monthly", priority: 0.6 });
  }
  for (const author of authors) {
    entries.push({ url: abs(authorUrl(author.slug)), lastModified: author.updatedAt, changeFrequency: "monthly", priority: 0.5 });
  }

  return entries;
}
