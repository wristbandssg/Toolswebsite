import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/seo";

// Generated fresh on every request so newly published content shows up
// immediately (same reasoning as the force-dynamic pages — the build
// environment can't reach the database).
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  const [tools, blogs, pages] = await Promise.all([
    prisma.tool.findMany({
      where: { status: "published" },
      select: { slug: true, updatedAt: true, seoMeta: true },
    }),
    prisma.blog.findMany({
      where: { status: "published" },
      select: { slug: true, updatedAt: true, seoMeta: true },
    }),
    prisma.page.findMany({
      where: { status: "published" },
      select: { slug: true, updatedAt: true, seoMeta: true },
    }),
  ]);

  const indexable = (item: { seoMeta: { robotsIndex: boolean } | null }) =>
    item.seoMeta?.robotsIndex !== false;

  const entries: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/tools`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
  ];

  for (const tool of tools.filter(indexable)) {
    entries.push({
      url: `${siteUrl}/tools/${tool.slug}`,
      lastModified: tool.updatedAt,
      changeFrequency: "weekly",
      priority: 0.9,
    });
  }
  for (const blog of blogs.filter(indexable)) {
    entries.push({
      url: `${siteUrl}/blog/${blog.slug}`,
      lastModified: blog.updatedAt,
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }
  for (const page of pages.filter(indexable)) {
    entries.push({
      url: `${siteUrl}/pages/${page.slug}`,
      lastModified: page.updatedAt,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  return entries;
}
