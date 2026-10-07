import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { categorySlugError, recordUrlChanges, saveRedirect, snapshotPublicUrls } from "@/lib/url-changes";

const renameSchema = z.object({
  name: z.string().trim().min(1, "Category name is required"),
  // Hero section content for the public category page —
  // both optional, omitting a key leaves that field untouched so this
  // same endpoint still works for a plain rename.
  heroSubheading: z.string().trim().optional(),
  heroDescription: z.string().trim().optional(),
  // Move this category under a different category (at any depth), or back
  // to top-level. Optional and only applied when the request body
  // explicitly includes the key (same convention as the hero fields
  // above) — pass an id string to file it under that category, or
  // null/"" to make it top-level. This is what lets an EXISTING category
  // be turned into a sub-category (or reparented, or promoted back) from
  // the admin UI — previously that was only possible when a sub-category
  // was first created via POST /api/tool-categories.
  parentId: z.string().trim().optional().nullable(),
  // The URL slug, set by hand. Omitted = unchanged, unless the name changed
  // (then it follows the name, as before).
  slug: z.string().trim().optional(),
  // Shorter name for breadcrumbs ("Finance" for "Finance Calculators"); "" = the name.
  breadcrumbName: z.string().trim().max(60, "Breadcrumb name should be 60 characters or less").optional(),
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
  const existing = await prisma.toolCategory.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Category not found" }, { status: 404 });
  // The slug (and so the URL) only changes when the name does — saving hero
  // text or moving the category must not quietly change its URL.
  const requestedSlug = parsed.data.slug ? slugify(parsed.data.slug).replace(/-+/g, "-").replace(/^-|-$/g, "") : "";
  const slug = requestedSlug || (existing.name === name ? existing.slug : slugify(name));
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
  // Arbitrary depth is allowed (see the ToolCategory.parentId comment in
  // schema.prisma), so the only thing to guard against is a CYCLE: this
  // category ending up nested inside one of its own descendants.
  const hasParentIdKey = Object.prototype.hasOwnProperty.call(body, "parentId");
  const nextParentId = (parsed.data.parentId || null) as string | null;
  const willBeMain = hasParentIdKey ? !nextParentId : !existing.parentId;
  if (slug !== existing.slug || willBeMain !== !existing.parentId) {
    const slugError = await categorySlugError(slug, willBeMain);
    if (slugError) return NextResponse.json({ error: slugError }, { status: 409 });
  }
  if (hasParentIdKey && nextParentId) {
    if (nextParentId === id) {
      return NextResponse.json({ error: "A category can't be its own parent" }, { status: 400 });
    }
    const parent = await prisma.toolCategory.findUnique({ where: { id: nextParentId } });
    if (!parent) {
      return NextResponse.json({ error: "That parent category no longer exists" }, { status: 400 });
    }
    // Walk up the candidate parent's own ancestor chain — if this
    // category's id shows up there, the candidate is one of ITS
    // descendants, and nesting under it would create a loop. Capped at 20
    // hops as a defensive backstop against corrupted data looping forever;
    // a real category tree on this site is only ever a few levels deep.
    let cursorId: string | null = parent.parentId;
    let hops = 0;
    while (cursorId && hops < 20) {
      if (cursorId === id) {
        return NextResponse.json(
          { error: "That category is nested under this one — pick a different parent to avoid a loop" },
          { status: 400 }
        );
      }
      const cursor: { parentId: string | null } | null = await prisma.toolCategory.findUnique({
        where: { id: cursorId },
        select: { parentId: true },
      });
      cursorId = cursor?.parentId ?? null;
      hops++;
    }
  }

  // Moving or renaming changes public URLs — store 301s from the old ones.
  const urlsBefore = await snapshotPublicUrls();
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
      ...(Object.prototype.hasOwnProperty.call(body, "breadcrumbName")
        ? { breadcrumbName: parsed.data.breadcrumbName || null }
        : {}),
    },
  });
  await recordUrlChanges(urlsBefore);
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
  // Deleting moves its calculators and sub-categories (new URLs), and its own
  // page goes away — keep every old URL working with a 301.
  const urlsBefore = await snapshotPublicUrls();

  // Mongo has no real foreign key — detach any tools pointing at this
  // category explicitly instead of leaving them with a dangling categoryId.
  const affected = await prisma.tool.updateMany({
    where: { categoryId: id },
    data: { categoryId: null },
  });

  // Same idea for sub-categories: deleting a category shouldn't silently
  // orphan or cascade-delete its children (the self-relation is
  // `onDelete: NoAction`, so Mongo would leave a dangling parentId
  // otherwise). Re-file them one level up — under THIS category's own
  // parent, if it had one (so deleting a middle category like "Tax
  // Calculators" moves its country sub-categories up to sit directly under
  // "Finance Calculators" rather than losing their place in the tree
  // entirely), or to top-level if it didn't.
  const deleted = await prisma.toolCategory.findUnique({ where: { id }, select: { parentId: true } });
  const detachedChildren = await prisma.toolCategory.updateMany({
    where: { parentId: id },
    data: { parentId: deleted?.parentId ?? null },
  });

  await prisma.toolCategory.delete({ where: { id } });
  await recordUrlChanges(urlsBefore);
  const oldUrl = urlsBefore.urls.get(`category:${id}`);
  if (oldUrl) {
    const parentUrl = deleted?.parentId ? (await snapshotPublicUrls()).urls.get(`category:${deleted.parentId}`) : undefined;
    await saveRedirect(oldUrl, parentUrl ?? "/calculators/");
  }

  return NextResponse.json({
    ok: true,
    detachedTools: affected.count,
    detachedSubcategories: detachedChildren.count,
  });
}
