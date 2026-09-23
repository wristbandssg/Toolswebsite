import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const renameSchema = z.object({
  name: z.string().trim().min(1, "Category name is required"),
  description: z.string().trim().max(2000).optional(),
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
  const { name, description } = parsed.data;
  const slug = slugify(name);
  if (!slug) {
    return NextResponse.json({ error: "That name doesn't produce a valid URL slug" }, { status: 400 });
  }

  try {
    const clashing = await prisma.blogCategory.findUnique({ where: { slug } });
    if (clashing && clashing.id !== id) {
      return NextResponse.json({ error: "A category with this name already exists" }, { status: 409 });
    }

    const category = await prisma.blogCategory.update({
      where: { id },
      data: {
        name,
        slug,
        ...(description !== undefined ? { description: description || null } : {}),
      },
    });
    return NextResponse.json({ category });
  } catch (err) {
    console.error(`[api/blog-categories/${id}] PUT failed:`, err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Could not save: ${err.message}`
            : "Could not save the category — unknown server error.",
      },
      { status: 500 }
    );
  }
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

  // A post can be filed under several categories at once, so deleting one
  // must only remove THIS category from each affected post's list, leaving
  // its other categories untouched. Prisma's typed API has no "remove one
  // value from a list" update, but going through the relation's own
  // `disconnect` does exactly that (and keeps BlogCategory.blogIds on the
  // other side of the many-to-many in sync too).
  const affectedBlogs = await prisma.blog.findMany({
    where: { categoryIds: { has: id } },
    select: { id: true },
  });
  await Promise.all(
    affectedBlogs.map((b) =>
      prisma.blog.update({ where: { id: b.id }, data: { categories: { disconnect: { id } } } })
    )
  );
  const affected = { count: affectedBlogs.length };

  // Same idea for sub-categories: deleting a parent category shouldn't
  // silently orphan or cascade-delete its children (self-relation is set
  // to `onDelete: NoAction`, so Mongo would leave a dangling parentId
  // otherwise). Promote them to top-level categories instead.
  const detachedChildren = await prisma.blogCategory.updateMany({
    where: { parentId: id },
    data: { parentId: null },
  });

  await prisma.blogCategory.delete({ where: { id } });

  return NextResponse.json({
    ok: true,
    detachedPosts: affected.count,
    detachedSubcategories: detachedChildren.count,
  });
}
