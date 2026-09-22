import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import BlogTemplate from "@/lib/templates/blog/BlogTemplate";
import { buildSeoMetadata, excerptFromHtml } from "@/lib/seo";

async function loadBlog(slug: string) {
  const blog = await prisma.blog.findUnique({
    where: { slug },
    include: {
      category: true,
      author: true,
      seoMeta: true,
      toolRelations: { include: { tool: true } },
      relatedFrom: { include: { relatedBlog: true } },
    },
  });
  if (!blog || blog.status !== "published") return null;
  return blog;
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
    seoMeta: blog.seoMeta,
    fallbackTitle: blog.title,
    fallbackDescription: blog.excerpt || excerptFromHtml(blog.content),
    path: `/blog/${blog.slug}`,
  });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const blog = await loadBlog(slug);
  if (!blog) notFound();

  return (
    <BlogTemplate
      blog={{
        slug: blog.slug,
        title: blog.title,
        featuredImage: blog.featuredImage,
        content: blog.content,
        tags: JSON.parse(blog.tags) as string[],
        publishedAt: blog.publishedAt ? blog.publishedAt.toISOString() : null,
        authorName: blog.author?.name,
      }}
      relatedTools={blog.toolRelations.map((r) => ({ slug: r.tool.slug, title: r.tool.title }))}
      relatedBlogs={blog.relatedFrom.map((r) => ({
        slug: r.relatedBlog.slug,
        title: r.relatedBlog.title,
      }))}
    />
  );
}
