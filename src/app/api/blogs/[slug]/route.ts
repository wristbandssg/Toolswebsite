import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

// Resolves the final set of category ids for a post: whatever was picked
// from the multi-select, plus (if provided) a brand-new category created on
// the fly from a typed name.
async function resolveCategoryIds(
  categoryIds: string[] = [],
  newCategoryName?: string | null
): Promise<string[]> {
  const ids = new Set(categoryIds);
  if (newCategoryName && newCategoryName.trim()) {
    const slug = slugify(newCategoryName);
    const category = await prisma.blogCategory.upsert({
      where: { slug },
      update: {},
      create: { name: newCategoryName.trim(), slug },
    });
    ids.add(category.id);
  }
  return [...ids];
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  // Admin-only: returns the blog regardless of status — the public site
  // reads published posts straight from Prisma with its own status filter.
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const { slug } = await params;
  const blog = await prisma.blog.findUnique({
    where: { slug },
    include: {
      categories: true,
      seoMeta: true,
      toolRelations: { include: { tool: true } },
      relatedFrom: { include: { relatedBlog: true } },
    },
  });
  if (!blog) return NextResponse.json({ error: "Blog not found" }, { status: 404 });
  return NextResponse.json({ blog });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const { slug } = await params;
  const body = await req.json();

  const existing = await prisma.blog.findUnique({ where: { slug } });
  if (!existing) return NextResponse.json({ error: "Blog not found" }, { status: 404 });

  const categoryIds = await resolveCategoryIds(
    Array.isArray(body.categoryIds) ? body.categoryIds : existing.categoryIds,
    body.newCategoryName
  );

  const blog = await prisma.blog.update({
    where: { slug },
    data: {
      title: body.title ?? existing.title,
      excerpt: body.excerpt !== undefined ? body.excerpt : existing.excerpt,
      featuredImage: body.featuredImage ?? existing.featuredImage,
      content: body.content ?? existing.content,
      tags: body.tags ? JSON.stringify(body.tags) : existing.tags,
      status: body.status ?? existing.status,
      publishedAt:
        body.status === "published"
          ? new Date(body.publishedAt || existing.publishedAt || Date.now())
          : body.publishedAt
            ? new Date(body.publishedAt)
            : existing.publishedAt,
      // `set` (a full replace) rather than `connect` — connect only adds,
      // it would never let unchecking a category in the admin UI remove it.
      categories: { set: categoryIds.map((id) => ({ id })) },
    },
  });

  if (Array.isArray(body.toolIds)) {
    await prisma.toolBlogRelation.deleteMany({ where: { blogId: blog.id } });
    if (body.toolIds.length > 0) {
      await prisma.toolBlogRelation.createMany({
        data: body.toolIds.map((toolId: string) => ({ toolId, blogId: blog.id })),
      });
    }
  }

  if (Array.isArray(body.relatedBlogIds)) {
    await prisma.blogRelatedBlog.deleteMany({ where: { blogId: blog.id } });
    if (body.relatedBlogIds.length > 0) {
      await prisma.blogRelatedBlog.createMany({
        data: body.relatedBlogIds.map((relatedBlogId: string) => ({
          blogId: blog.id,
          relatedBlogId,
        })),
      });
    }
  }

  return NextResponse.json({ blog });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const { slug } = await params;
  await prisma.blog.delete({ where: { slug } });
  return NextResponse.json({ ok: true });
}
