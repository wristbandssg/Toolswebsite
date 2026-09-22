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

async function resolveCategoryId(categoryId?: string | null, newCategoryName?: string | null) {
  if (newCategoryName && newCategoryName.trim()) {
    const slug = slugify(newCategoryName);
    const category = await prisma.blogCategory.upsert({
      where: { slug },
      update: {},
      create: { name: newCategoryName.trim(), slug },
    });
    return category.id;
  }
  return categoryId || undefined;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const blog = await prisma.blog.findUnique({
    where: { slug },
    include: {
      category: true,
      seoMeta: true,
      toolRelations: { include: { tool: true } },
      relatedFrom: { include: { relatedBlog: true } },
    },
  });
  if (!blog) return NextResponse.json({ error: "Blog পাওয়া যায়নি" }, { status: 404 });
  return NextResponse.json({ blog });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login প্রয়োজন" }, { status: 401 });
  }
  const { slug } = await params;
  const body = await req.json();

  const existing = await prisma.blog.findUnique({ where: { slug } });
  if (!existing) return NextResponse.json({ error: "Blog পাওয়া যায়নি" }, { status: 404 });

  const categoryId = await resolveCategoryId(body.categoryId, body.newCategoryName);

  const blog = await prisma.blog.update({
    where: { slug },
    data: {
      title: body.title ?? existing.title,
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
      categoryId: categoryId ?? existing.categoryId,
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
    return NextResponse.json({ error: "Login প্রয়োজন" }, { status: 401 });
  }
  const { slug } = await params;
  await prisma.blog.delete({ where: { slug } });
  return NextResponse.json({ ok: true });
}
