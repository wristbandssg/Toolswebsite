import { prisma } from "@/lib/prisma";
import type { Design1Content } from "@/lib/homepage-config";
import { iconKeyForSlug } from "@/lib/home-icons";

// Builds what Design 1 renders from the live category tree + published tools,
// following the admin's homepage settings. Empty admin lists mean "automatic".

type CategoryRow = { id: string; name: string; slug: string; parentId: string | null };

export type HomeTile = { slug: string; label: string; iconKey: string; toolCount: number };
export type HomeSection = {
  slug: string;
  heading: string;
  toolCount: number;
  tools: { slug: string; title: string }[];
};

export async function loadDesign1Data(content: Design1Content) {
  const categories: CategoryRow[] = await prisma.toolCategory.findMany({
    select: { id: true, name: true, slug: true, parentId: true },
    orderBy: { name: "asc" },
  });
  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  const byParent = new Map<string, CategoryRow[]>();
  for (const c of categories) {
    if (!c.parentId) continue;
    byParent.set(c.parentId, [...(byParent.get(c.parentId) ?? []), c]);
  }
  const subtree = (id: string): string[] => [id, ...(byParent.get(id) ?? []).flatMap((c) => subtree(c.id))];

  const countCache = new Map<string, number>();
  async function countFor(c: CategoryRow): Promise<number> {
    if (!countCache.has(c.id)) {
      countCache.set(c.id, await prisma.tool.count({ where: { status: "published", categoryId: { in: subtree(c.id) } } }));
    }
    return countCache.get(c.id)!;
  }

  // "Automatic" category list: the categories directly under each main
  // category (a main category without sub-categories counts as one itself),
  // biggest first, empty ones dropped. (Top-level = no parentId, checked in
  // code — on MongoDB a `parentId: null` filter misses unset fields.)
  async function autoCategories(): Promise<CategoryRow[]> {
    const mains = categories.filter((c) => !c.parentId);
    const candidates = mains.flatMap((m) => {
      const children = byParent.get(m.id) ?? [];
      return children.length > 0 ? children : [m];
    });
    const withCounts = await Promise.all(candidates.map(async (c) => ({ c, n: await countFor(c) })));
    return withCounts.filter((x) => x.n > 0).sort((a, b) => b.n - a.n).map((x) => x.c);
  }

  const auto = await autoCategories();

  // Icon tiles.
  const tileSources =
    content.iconItems.length > 0
      ? content.iconItems.flatMap((item) => {
          const c = bySlug.get(item.categorySlug);
          return c ? [{ c, label: item.label, icon: item.icon }] : [];
        })
      : auto.map((c) => ({ c, label: "", icon: "" }));
  const tiles: HomeTile[] = await Promise.all(
    tileSources.map(async ({ c, label, icon }) => ({
      slug: c.slug,
      label: label || c.name,
      iconKey: icon || iconKeyForSlug(c.slug),
      toolCount: await countFor(c),
    }))
  );

  // Link sections.
  const sectionSources =
    content.sections.length > 0
      ? content.sections.flatMap((s) => {
          const c = bySlug.get(s.categorySlug);
          return c ? [{ c, heading: s.heading, pinned: s.toolSlugs }] : [];
        })
      : auto.slice(0, content.autoSectionCount).map((c) => ({ c, heading: "", pinned: [] as string[] }));
  const sections: HomeSection[] = await Promise.all(
    sectionSources.map(async ({ c, heading, pinned }) => {
      const ids = subtree(c.id);
      const pinnedTools = pinned.length
        ? await prisma.tool.findMany({
            where: { status: "published", slug: { in: pinned } },
            select: { slug: true, title: true },
          })
        : [];
      const pinnedOrdered = pinned.flatMap((slug) => pinnedTools.filter((t) => t.slug === slug));
      const fill = await prisma.tool.findMany({
        where: { status: "published", categoryId: { in: ids }, slug: { notIn: pinnedOrdered.map((t) => t.slug) } },
        orderBy: [{ isPopular: "desc" }, { title: "asc" }],
        take: Math.max(0, content.linksPerSection - pinnedOrdered.length),
        select: { slug: true, title: true },
      });
      return {
        slug: c.slug,
        heading: heading || c.name,
        toolCount: await countFor(c),
        tools: [...pinnedOrdered, ...fill].slice(0, content.linksPerSection),
      };
    })
  );

  const totalTools = await prisma.tool.count({ where: { status: "published" } });

  return { tiles, sections: sections.filter((s) => s.tools.length > 0), totalTools };
}
