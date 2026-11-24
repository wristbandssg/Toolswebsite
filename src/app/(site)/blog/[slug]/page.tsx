import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import BlogTemplate from "@/lib/templates/blog/BlogTemplate";
import { buildSeoMetadata, excerptFromHtml } from "@/lib/seo";
import { resolveAuthorProfile } from "@/lib/authors";
import { blogUrl } from "@/lib/urls";
import { getCategoryIndex } from "@/lib/category-index";
import { getSiteGeneralSettings } from "@/lib/site-config";
import { blogJsonLd } from "@/lib/structured-data";
import JsonLd from "@/components/site/JsonLd";
import { publicImageUrl, siteLogoUrl } from "@/lib/image-urls";

async function loadBlog(slug: string) {
  const blog = await prisma.blog.findUnique({
    where: { slug },
    include: {
      categories: true,
      author: true,
      authorProfile: true,
      seoMeta: true,
      toolRelations: { include: { tool: true } },
      relatedFrom: { include: { relatedBlog: { include: { categories: true } } } },
    },
  });
  if (!blog || blog.status !== "published") return null;
  return blog;
}

/** The share image (SEO override, else the featured image) as a real image URL. */
function shareImage(blog: { slug: string; featuredImage: string | null; seoMeta: { ogImage: string | null } | null }) {
  return publicImageUrl(blog.seoMeta?.ogImage || blog.featuredImage, "blog-share", blog.slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const blog = await loadBlog(slug);
  if (!blog) return {};
  return buildSeoMetadata({
    seoMeta: {
      ...blog.seoMeta,
      // The Social Share Image field was removed from the admin Blog form
      // to keep it simple — this is its promised fallback: reuse the post's
      // own Featured Image for social share previews when no override was
      // set on the dedicated SEO settings page.
      ogImage: shareImage(blog),
    },
    fallbackTitle: blog.title,
    fallbackDescription: blog.excerpt || excerptFromHtml(blog.content),
    path: blogUrl(blog.slug),
  });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const blog = await loadBlog(slug);
  if (!blog) notFound();
  const [authorProfile, index, settings] = await Promise.all([
    resolveAuthorProfile(blog.authorProfile),
    getCategoryIndex(),
    getSiteGeneralSettings(),
  ]);

  return (
    <>
    <JsonLd
      data={blogJsonLd({
        title: blog.title,
        description: blog.seoMeta?.metaDescription || blog.excerpt || excerptFromHtml(blog.content),
        path: blogUrl(blog.slug),
        schemaType: blog.seoMeta?.schemaType,
        image: shareImage(blog),
        publishedAt: blog.publishedAt,
        updatedAt: blog.updatedAt,
        author: authorProfile ? { name: authorProfile.name, slug: authorProfile.slug } : blog.author?.name ? { name: blog.author.name } : null,
        siteName: settings.siteName,
        logoUrl: siteLogoUrl(settings.logoUrl),
      })}
    />
    <BlogTemplate
      blog={{
        slug: blog.slug,
        title: blog.title,
        excerpt: blog.excerpt,
        featuredImage: publicImageUrl(blog.featuredImage, "blog", blog.slug),
        content: blog.content,
        tags: JSON.parse(blog.tags) as string[],
        publishedAt: blog.publishedAt ? blog.publishedAt.toISOString() : null,
        updatedAt: blog.updatedAt.toISOString(),
        authorName: blog.author?.name,
        categories: blog.categories.map((c) => ({ name: c.name, slug: c.slug })),
      }}
      authorProfile={authorProfile}
      relatedTools={blog.toolRelations
        .filter((r) => r.tool.status === "published")
        .map((r) => ({ slug: r.tool.slug, title: r.tool.title, href: index.toolHref(r.tool) }))}
      relatedBlogs={blog.relatedFrom
        // A related post picked while it was still a draft shouldn't show
        // up as a dead link once it's live — the public post page 404s on
        // anything that isn't published.
        .filter((r) => r.relatedBlog.status === "published")
        .map((r) => ({
          slug: r.relatedBlog.slug,
          title: r.relatedBlog.title,
          publishedAt: r.relatedBlog.publishedAt ? r.relatedBlog.publishedAt.toISOString() : null,
          // The compact "More Articles" list stays to one label per post —
          // just the first category, not the full multi-select list.
          categoryName: r.relatedBlog.categories[0]?.name,
        }))}
    />
    </>
  );
}
