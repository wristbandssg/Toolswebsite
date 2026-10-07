import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { saveRedirect } from "@/lib/url-changes";
import { blogCategoryUrl } from "@/lib/urls";

const updateSchema = z.object({
  name: z.string().trim().min(1, "Category name is required"),
  description: z.string().trim().max(2000).optional(),
  // URL slug set by hand. Omitted = unchanged, unless the name changed (then it follows the name).
  slug: z.string().trim().optional(),
  // Move under a top-level category, or back to top-level (null/""). Only
  // applied when the key is present. Blog categories nest one level deep.
  parentId: z.string().trim().optional().nullable(),
});

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
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
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid category" },
      { status: 400 }
    );
  }
  const { name, description } = parsed.data;

  try {
    const existing = await prisma.blogCategory.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Category not found" }, { status: 404 });

    // The slug (and so the URL) only changes when it is edited or the name changes.
    const slug = parsed.data.slug ? slugify(parsed.data.slug) : existing.name === name ? existing.slug : slugify(name);
    if (!slug) {
      return NextResponse.json({ error: "That doesn't produce a valid URL slug" }, { status: 400 });
    }
    const clashing = await prisma.blogCategory.findUnique({ where: { slug } });
    if (clashing && clashing.id !== id) {
      return NextResponse.json({ error: "Another category already uses this URL slug" }, { status: 409 });
    }

    const hasParentIdKey = Object.prototype.hasOwnProperty.call(body, "parentId");
    const nextParentId = (parsed.data.parentId || null) as string | null;
    if (hasParentIdKey && nextParentId && nextParentId !== existing.parentId) {
      if (nextParentId === id) {
        return NextResponse.json({ error: "A category can't be its own parent" }, { status: 400 });
      }
      const parent = await prisma.blogCategory.findUnique({ where: { id: nextParentId } });
      if (!parent) return NextResponse.json({ error: "That parent category no longer exists" }, { status: 400 });
      if (parent.parentId) {
        return NextResponse.json(
          { error: "Sub-categories can only be one level deep — pick a top-level category as the parent" },
          { status: 400 }
        );
      }
      if ((await prisma.blogCategory.count({ where: { parentId: id } })) > 0) {
        return NextResponse.json(
          { error: "This category has sub-categories of its own, so it has to stay top-level" },
          { status: 400 }
        );
      }
    }

    const category = await prisma.blogCategory.update({
      where: { id },
      data: {
        name,
        slug,
        ...(description !== undefined ? { description: description || null } : {}),
        ...(hasParentIdKey ? { parentId: nextParentId } : {}),
      },
    });
    // A new slug is a new URL — the old one 301s to it.
    if (slug !== existing.slug) await saveRedirect(blogCategoryUrl(existing.slug), blogCategoryUrl(slug));
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
