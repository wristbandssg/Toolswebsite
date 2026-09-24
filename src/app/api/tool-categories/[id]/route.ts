import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const renameSchema = z.object({
  name: z.string().trim().min(1, "Category name is required"),
  // Hero section content for the public /tools/category/[slug] page —
  // both optional, omitting a key leaves that field untouched so this
  // same endpoint still works for a plain rename.
  heroSubheading: z.string().trim().optional(),
  heroDescription: z.string().trim().optional(),
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

  const clashing = await prisma.toolCategory.findUnique({ where: { slug } });
  if (clashing && clashing.id !== id) {
    return NextResponse.json({ error: "A category with this name already exists" }, { status: 409 });
  }

  const category = await prisma.toolCategory.update({
    where: { id },
    data: {
      name,
      slug,
      // Only touched when the request explicitly includes the key, so a
      // plain { name } rename never wipes out hero content set earlier —
      // an empty string, on the other hand, clears it back to the
      // generated fallback copy the public page falls back to.
      ...(Object.prototype.hasOwnProperty.call(body, "heroSubheading")
        ? { heroSubheading: parsed.data.heroSubheading || null }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(body, "heroDescription")
        ? { heroDescription: parsed.data.heroDescription || null }
        : {}),
    },
  });
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

  // Mongo has no real foreign key — detach any tools pointing at this
  // category explicitly instead of leaving them with a dangling categoryId.
  const affected = await prisma.tool.updateMany({
    where: { categoryId: id },
    data: { categoryId: null },
  });
  await prisma.toolCategory.delete({ where: { id } });

  return NextResponse.json({ ok: true, detachedTools: affected.count });
}
