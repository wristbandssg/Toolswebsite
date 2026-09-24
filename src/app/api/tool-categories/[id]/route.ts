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
  // Move this category under a different top-level category, or back to
  // top-level. Optional and only applied when the request body explicitly
  // includes the key (same convention as the hero fields above) — pass an
  // id string to file it under that category, or null/"" to make it
  // top-level. This is what lets an EXISTING category be turned into a
  // sub-category (or reparented, or promoted back) from the admin UI —
  // previously that was only possible when a sub-category was first
  // created via POST /api/tool-categories.
  parentId: z.string().trim().optional().nullable(),
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

  // parentId follows the same "only touched when the key is present"
  // convention as the hero fields, but needs real validation first — unlike
  // a hero paragraph, a bad parentId would corrupt the category tree.
  const hasParentIdKey = Object.prototype.hasOwnProperty.call(body, "parentId");
  const nextParentId = (parsed.data.parentId || null) as string | null;
  if (hasParentIdKey && nextParentId) {
    if (nextParentId === id) {
      return NextResponse.json({ error: "A category can't be its own parent" }, { status: 400 });
    }
    const parent = await prisma.toolCategory.findUnique({ where: { id: nextParentId } });
    if (!parent) {
      return NextResponse.json({ error: "That parent category no longer exists" }, { status: 400 });
    }
    if (parent.parentId) {
      return NextResponse.json(
        { error: "Sub-categories can only be one level deep — pick a top-level category as the parent" },
        { status: 400 }
      );
    }
    const childCount = await prisma.toolCategory.count({ where: { parentId: id } });
    if (childCount > 0) {
      return NextResponse.json(
        {
          error:
            "This category has its own sub-categories, so it can't become a sub-category itself — move or remove them first",
        },
        { status: 400 }
      );
    }
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
      ...(hasParentIdKey ? { parentId: nextParentId } : {}),
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

  // Same idea for sub-categories: deleting a parent category shouldn't
  // silently orphan or cascade-delete its children (the self-relation is
  // `onDelete: NoAction`, so Mongo would leave a dangling parentId
  // otherwise). Promote them to top-level categories instead — same
  // behavior as deleting a Blog Category with sub-categories.
  const detachedChildren = await prisma.toolCategory.updateMany({
    where: { parentId: id },
    data: { parentId: null },
  });

  await prisma.toolCategory.delete({ where: { id } });

  return NextResponse.json({
    ok: true,
    detachedTools: affected.count,
    detachedSubcategories: detachedChildren.count,
  });
}
