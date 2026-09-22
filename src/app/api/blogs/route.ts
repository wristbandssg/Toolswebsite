import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const blogSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  title: z.string().min(1),
  featuredImage: z.string().optional().nullable(),
  content: z.string().min(1),
  tags: z.array(z.string()).default([]),
  status: z.enum(["draft", "in_review", "published", "needs_update"]).default("draft"),
  publishedAt: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  newCategoryName: z.string().optional().nullable(),
  toolIds: z.array(z.string()).default([]),
  relatedBlogIds: z.array(z.string()).default([]),
});

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

export async function GET() {
  // Admin-only: this returns every Blog regardless of status (including
  // drafts), so it must not be reachable without a session.
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const blogs = await prisma.blog.findMany({
    orderBy: { updatedAt: "desc" },
    include: { category: true, toolRelations: true },
  });
  return NextResponse.json({ blogs });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = blogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Form validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const existing = await prisma.blog.findUnique({ where: { slug: data.slug } });
  if (existing) {
    return NextResponse.json({ error: "This slug is already in use" }, { status: 409 });
  }

  const categoryId = await resolveCategoryId(data.categoryId, data.newCategoryName);
  const authorId = (session.user as { id?: string }).id;

  const blog = await prisma.blog.create({
    data: {
      slug: data.slug,
      title: data.title,
      featuredImage: data.featuredImage || null,
      content: data.content,
      tags: JSON.stringify(data.tags),
      status: data.status,
      publishedAt:
        data.status === "published"
          ? new Date(data.publishedAt || Date.now())
          : data.publishedAt
            ? new Date(data.publishedAt)
            : null,
      categoryId: categoryId ?? undefined,
      authorId: authorId ?? undefined,
      toolRelations: {
        create: data.toolIds.map((toolId) => ({ toolId })),
      },
      relatedFrom: {
        create: data.relatedBlogIds.map((relatedBlogId) => ({ relatedBlogId })),
      },
    },
  });

  return NextResponse.json({ blog }, { status: 201 });
}
