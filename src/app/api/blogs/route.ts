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
  excerpt: z.string().max(300).optional().nullable(),
  featuredImage: z.string().optional().nullable(),
  content: z.string().min(1),
  tags: z.array(z.string()).default([]),
  status: z.enum(["draft", "in_review", "published", "needs_update"]).default("draft"),
  publishedAt: z.string().optional().nullable(),
  // A post can belong to more than one category/sub-category.
  categoryIds: z.array(z.string()).default([]),
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

export async function GET() {
  // Admin-only: this returns every Blog regardless of status (including
  // drafts), so it must not be reachable without a session.
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const blogs = await prisma.blog.findMany({
    orderBy: { updatedAt: "desc" },
    include: { categories: true, toolRelations: true },
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

  const categoryIds = await resolveCategoryIds(data.categoryIds, data.newCategoryName);
  const authorId = (session.user as { id?: string }).id;

  const blog = await prisma.blog.create({
    data: {
      slug: data.slug,
      title: data.title,
      excerpt: data.excerpt || null,
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
      categories: { connect: categoryIds.map((id) => ({ id })) },
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
