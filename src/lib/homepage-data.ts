import { prisma } from "@/lib/prisma";
import type { Design1Content, Design2Content } from "@/lib/homepage-config";
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

// ---------------------------------------------------------------------------
// Design 2 — Category Showcase.

/** Emoji for a category / calculator when the admin didn't pick one. */
const EMOJI_RULES: [RegExp, string][] = [
  [/crypto|bitcoin/, "₿"],
  [/mortgage|home|house|property|real-estate|rent/, "🏠"],
  [/car|auto|vehicle/, "🚗"],
  [/insurance/, "🛡️"],
  [/tax/, "🧾"],
  [/salary|income|pay|wage/, "💵"],
  [/loan|debt|credit/, "💳"],
  [/retire|pension/, "🏖️"],
  [/invest|stock|return|roi|growth/, "📈"],
  [/saving|budget/, "🐷"],
  [/business|profit|margin/, "📊"],
  [/currency|forex|exchange/, "💱"],
  [/interest/, "💹"],
  [/health|bmi|calorie|fitness/, "❤️"],
  [/math|percent/, "🔢"],
  [/science/, "🔬"],
  [/construction|concrete|brick/, "🏗️"],
  [/finance|money/, "💰"],
];

export function emojiForSlug(slug: string): string {
  return EMOJI_RULES.find(([re]) => re.test(slug))?.[1] ?? "🧮";
}

export type D2CategoryCard = { slug: string; icon: string; title: string; description: string; toolCount: number };
export type D2PopularTool = { slug: string; title: string; icon: string; categoryName: string };
export type D2Guide = {
  slug: string;
  name: string;
  icon: string;
  title: string;
  text: string;
  tools: { slug: string; title: string }[];
};
export type D2Blog = { slug: string; title: string; excerpt: string; image: string; category: string };

/** Plain-text summary of a post, cut to `maxWords` words ("…" when cut). */
export function blogSummary(excerpt: string | null, html: string, title: string, maxWords: number): string {
  if (maxWords <= 0) return "";
  // An excerpt that only repeats the title adds nothing — use the post's own text instead.
  const base =
    excerpt && excerpt.trim().toLowerCase() !== title.trim().toLowerCase()
      ? excerpt
      : html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]*>/g, " ");
  const words = base
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;/g, "’")
    .replace(/&quot;/g, '"')
    .split(/\s+/)
    .filter(Boolean);
  return words.length > maxWords ? words.slice(0, maxWords).join(" ").replace(/[\s,.;:!?&—–-]+$/, "") + "…" : words.join(" ");
}

export async function loadDesign2Data(content: Design2Content) {
  const categories = await prisma.toolCategory.findMany({
    select: { id: true, name: true, slug: true, parentId: true, heroSubheading: true, heroDescription: true },
    orderBy: { name: "asc" },
  });
  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  const byId = new Map(categories.map((c) => [c.id, c]));
  const byParent = new Map<string, typeof categories>();
  for (const c of categories) {
    if (!c.parentId) continue;
    byParent.set(c.parentId, [...(byParent.get(c.parentId) ?? []), c]);
  }
  const subtree = (id: string): string[] => [id, ...(byParent.get(id) ?? []).flatMap((c) => subtree(c.id))];
  const countCache = new Map<string, number>();
  async function countFor(id: string): Promise<number> {
    if (!countCache.has(id)) {
      countCache.set(id, await prisma.tool.count({ where: { status: "published", categoryId: { in: subtree(id) } } }));
    }
    return countCache.get(id)!;
  }

  // Automatic list: the categories directly under each main category (a main
  // category without sub-categories counts as one itself), biggest first.
  const mains = categories.filter((c) => !c.parentId);
  const candidates = mains.flatMap((m) => {
    const children = byParent.get(m.id) ?? [];
    return children.length > 0 ? children : [m];
  });
  const auto = (await Promise.all(candidates.map(async (c) => ({ c, n: await countFor(c.id) }))))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .map((x) => x.c);

  const describe = (c: (typeof categories)[number], n: number) =>
    c.heroDescription || c.heroSubheading || `Browse ${n} free ${c.name.toLowerCase()} — fast, accurate and easy to use.`;

  // Category cards.
  const cardSources =
    content.categoryCards.length > 0
      ? content.categoryCards.flatMap((card) => {
          const c = bySlug.get(card.categorySlug);
          return c ? [{ c, card }] : [];
        })
      : auto.slice(0, content.autoCategoryCount).map((c) => ({ c, card: null }));
  const categoryCards: D2CategoryCard[] = await Promise.all(
    cardSources.map(async ({ c, card }) => {
      const n = await countFor(c.id);
      return {
        slug: c.slug,
        icon: card?.icon || emojiForSlug(c.slug),
        title: card?.title || c.name,
        description: card?.description || describe(c, n),
        toolCount: n,
      };
    })
  );

  // Popular calculators: the admin's list, or Popular-marked tools first.
  const toolSelect = { slug: true, title: true, categoryId: true } as const;
  let popularRows: { slug: string; title: string; categoryId: string | null; icon: string }[];
  if (content.popularTools.length > 0) {
    const rows = await prisma.tool.findMany({
      where: { status: "published", slug: { in: content.popularTools.map((t) => t.toolSlug) } },
      select: toolSelect,
    });
    popularRows = content.popularTools.flatMap((p) => {
      const row = rows.find((r) => r.slug === p.toolSlug);
      return row ? [{ ...row, icon: p.icon }] : [];
    });
  } else {
    const rows = await prisma.tool.findMany({
      where: { status: "published" },
      orderBy: [{ isPopular: "desc" }, { title: "asc" }],
      take: content.autoPopularCount,
      select: toolSelect,
    });
    popularRows = rows.map((r) => ({ ...r, icon: "" }));
  }
  const popularTools: D2PopularTool[] = popularRows.map((r) => {
    const cat = r.categoryId ? byId.get(r.categoryId) : undefined;
    return {
      slug: r.slug,
      title: r.title,
      icon: r.icon || emojiForSlug(`${r.slug} ${cat?.slug ?? ""}`),
      categoryName: cat?.name.replace(/ Calculators?$/, "") ?? "",
    };
  });

  // Category guides.
  const guideSources =
    content.guideCards.length > 0
      ? content.guideCards.flatMap((g) => {
          const c = bySlug.get(g.categorySlug);
          return c ? [{ c, g }] : [];
        })
      : auto.slice(0, content.autoGuideCount).map((c) => ({ c, g: null }));
  const guides: D2Guide[] = await Promise.all(
    guideSources.map(async ({ c, g }) => {
      const pinned = g?.toolSlugs ?? [];
      const pinnedRows = pinned.length
        ? await prisma.tool.findMany({ where: { status: "published", slug: { in: pinned } }, select: { slug: true, title: true } })
        : [];
      const pinnedOrdered = pinned.flatMap((slug) => pinnedRows.filter((t) => t.slug === slug));
      const fill = await prisma.tool.findMany({
        where: { status: "published", categoryId: { in: subtree(c.id) }, slug: { notIn: pinnedOrdered.map((t) => t.slug) } },
        orderBy: [{ isPopular: "desc" }, { title: "asc" }],
        take: Math.max(0, content.guideToolsPerCard - pinnedOrdered.length),
        select: { slug: true, title: true },
      });
      return {
        slug: c.slug,
        name: c.name,
        icon: g?.icon || emojiForSlug(c.slug),
        title: g?.title || c.name,
        text: g?.text || describe(c, await countFor(c.id)),
        tools: [...pinnedOrdered, ...fill].slice(0, content.guideToolsPerCard),
      };
    })
  );

  const blogRows = content.showBlogs
    ? await prisma.blog.findMany({
        where: { status: "published" },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        take: content.blogCount,
        select: {
          slug: true,
          title: true,
          excerpt: true,
          content: true,
          featuredImage: true,
          categories: { select: { name: true }, take: 1 },
        },
      })
    : [];
  const blogs: D2Blog[] = blogRows.map((b) => ({
    slug: b.slug,
    title: b.title,
    excerpt: blogSummary(b.excerpt, b.content, b.title, content.blogExcerptWords),
    image: b.featuredImage ?? "",
    category: b.categories[0]?.name ?? "",
  }));

  const totalTools = await prisma.tool.count({ where: { status: "published" } });

  return {
    categoryCards: categoryCards.filter((c) => c.toolCount > 0),
    popularTools,
    guides: guides.filter((g) => g.tools.length > 0),
    blogs,
    totalTools,
    autoCategorySlugs: auto.map((c) => c.slug),
  };
}
