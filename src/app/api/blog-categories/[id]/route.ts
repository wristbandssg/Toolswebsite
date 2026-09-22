import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const renameSchema = z.object({
  name: z.string().trim().min(1, "Category name is required"),
});

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const parsed = renameSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid category name" },
      { status: 400 }
    );
  }
  const name = parsed.data.name;
  const slug = slugify(name);
  if (!slug) {
    return NextResponse.json({ error: "That name doesn't produce a valid URL slug" }, { status: 400 });
  }

  const clashing = await prisma.blogCategory.findUnique({ where: { slug } });
  if (clashing && clashing.id !== id) {
    return NextResponse.json({ error: "A category with this name already exists" }, { status: 409 });
  }

  const category = await prisma.blogCategory.update({ where: { id }, data: { name, slug } });
  return NextResponse.json({ category });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  const { id } = await params;

  // Mongo has no real foreign key, so a Blog left pointing at a deleted
  // category wouldn't error — but it would silently show "no category" on
  // the public site. Detach those posts explicitly instead, and tell the
  // admin how many were affected.
  const affected = await prisma.blog.updateMany({
    where: { categoryId: id },
    data: { categoryId: null },
  });
  await prisma.blogCategory.delete({ where: { id } });

  return NextResponse.json({ ok: true, detachedPosts: affected.count });
}
