import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const createSchema = z.object({
  name: z.string().trim().min(1, "Category name is required"),
  heroSubheading: z.string().trim().optional(),
  heroDescription: z.string().trim().optional(),
  // Optional parent category id — when set, this becomes a sub-category.
  // Kept to a single level deep: the chosen parent must itself be a
  // top-level category (checked below), so a sub-category can never have
  // its own sub-categories. Same pattern as BlogCategory's parentId.
  parentId: z.string().trim().optional().nullable(),
});

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const categories = await prisma.toolCategory.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { tools: true } } },
  });
  return NextResponse.json({
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      parentId: c.parentId,
      heroSubheading: c.heroSubheading ?? "",
      heroDescription: c.heroDescription ?? "",
      toolCount: c._count.tools,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid category name" },
      { status: 400 }
    );
  }
  const name = parsed.data.name;
  const { parentId } = parsed.data;
  const slug = slugify(name);
  if (!slug) {
    return NextResponse.json({ error: "That name doesn't produce a valid URL slug" }, { status: 400 });
  }

  const existing = await prisma.toolCategory.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: "A category with this name already exists" }, { status: 409 });
  }

  if (parentId) {
    const parent = await prisma.toolCategory.findUnique({ where: { id: parentId } });
    if (!parent) {
      return NextResponse.json({ error: "That parent category no longer exists" }, { status: 400 });
    }
    if (parent.parentId) {
      return NextResponse.json(
        { error: "Sub-categories can only be one level deep — pick a top-level category as the parent" },
        { status: 400 }
      );
    }
  }

  const category = await prisma.toolCategory.create({
    data: {
      name,
      slug,
      heroSubheading: parsed.data.heroSubheading || null,
      heroDescription: parsed.data.heroDescription || null,
      ...(parentId ? { parentId } : {}),
    },
  });
  return NextResponse.json({ category: { ...category, toolCount: 0 } }, { status: 201 });
}
