import { prisma } from "@/lib/prisma";
import type { LinkSuggestion } from "@/components/admin/MenuBuilder";

/** Links the Header/Footer Builders offer in their "+ Add page…" pickers. */
export async function getLinkSuggestions(): Promise<LinkSuggestion[]> {
  const [pages, toolCategories, blogCategories] = await Promise.all([
    prisma.page.findMany({ where: { status: "published" }, orderBy: { title: "asc" }, select: { title: true, slug: true } }),
    prisma.toolCategory.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true, parentId: true } }),
    prisma.blogCategory.findMany({ orderBy: { name: "asc" }, select: { name: true, slug: true, parentId: true } }),
  ]);
  // Main categories and the ones directly under them (deeper levels would make the list too long).
  const rootIds = new Set(toolCategories.filter((c) => !c.parentId).map((c) => c.id));
  const topCategories = toolCategories.filter((c) => !c.parentId || rootIds.has(c.parentId));

  return [
    { group: "Main", label: "Home", href: "/" },
    { group: "Main", label: "Calculators", href: "/calculators" },
    { group: "Main", label: "Blog", href: "/blog" },
    ...pages.map((p) => ({ group: "Pages", label: p.title, href: `/pages/${p.slug}` })),
    ...topCategories.map((c) => ({ group: "Calculator Categories", label: c.name, href: `/tools/category/${c.slug}` })),
    ...blogCategories
      .filter((c) => !c.parentId)
      .map((c) => ({ group: "Blog Categories", label: c.name, href: `/blog/category/${c.slug}` })),
  ];
}
