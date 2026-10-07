import { prisma } from "@/lib/prisma";
import type { Design3Content } from "@/lib/homepage-config";
import { blogSummary, emojiForSlug, type D2Blog } from "@/lib/homepage-data";

// Builds what home page Design 3 ("Clean Library") renders from the live
// categories, published calculators and blog posts, following the admin's
// settings. Empty admin lists mean "automatic".

export type D3ToolCard = { slug: string; title: string; description: string; icon: string; badge: string };
export type D3CategoryCard = { slug: string; icon: string; title: string; description: string; toolCount: number };
export type D3Link = { text: string; href: string };
export type D3HubItem = { title: string; text: string; href: string };
export type D3Country = { flag: string; label: string; href: string };

// Country hubs found automatically from category slugs (e.g. "uk-tax-salary-calculators").
const COUNTRIES: { re: RegExp; flag: string; name: string }[] = [
  { re: /^(us|usa|united-states)-/, flag: "🇺🇸", name: "United States" },
  { re: /^canada-/, flag: "🇨🇦", name: "Canada" },
  { re: /^(uk|united-kingdom)-/, flag: "🇬🇧", name: "United Kingdom" },
  { re: /^australia-/, flag: "🇦🇺", name: "Australia" },
  { re: /^singapore-/, flag: "🇸🇬", name: "Singapore" },
  { re: /^new-zealand-/, flag: "🇳🇿", name: "New Zealand" },
  { re: /^india-/, flag: "🇮🇳", name: "India" },
  { re: /^malaysia-/, flag: "🇲🇾", name: "Malaysia" },
  { re: /^philippines-/, flag: "🇵🇭", name: "Philippines" },
  { re: /^hong-kong-/, flag: "🇭🇰", name: "Hong Kong" },
  { re: /^pakistan-/, flag: "🇵🇰", name: "Pakistan" },
  { re: /^bangladesh-/, flag: "🇧🇩", name: "Bangladesh" },
  { re: /^(uae|united-arab-emirates)-/, flag: "🇦🇪", name: "UAE" },
  { re: /^germany-/, flag: "🇩🇪", name: "Germany" },
  { re: /^france-/, flag: "🇫🇷", name: "France" },
];

const categoryHref = (slug: string) => `/tools/category/${slug}`;

type ToolRow = { slug: string; title: string; description: string | null; categoryId: string | null; isPopular: boolean };
const toolSelect = { slug: true, title: true, description: true, categoryId: true, isPopular: true } as const;

export async function loadDesign3Data(content: Design3Content) {
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

  // Automatic category list: the categories directly under each main
  // category (a main category without sub-categories counts as one itself),
  // biggest first, empty ones dropped.
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
    c.heroSubheading || c.heroDescription || `Browse ${n} free ${c.name.toLowerCase()}.`;

  // Calculator cards — the admin's list, or an automatic one.
  async function toolCards(
    picked: Design3Content["popularTools"],
    autoRows: () => Promise<ToolRow[]>,
    autoBadge: (row: ToolRow) => string
  ): Promise<D3ToolCard[]> {
    const toCard = (r: ToolRow, icon: string, badge: string, description: string): D3ToolCard => ({
      slug: r.slug,
      title: r.title,
      description: description || r.description || "",
      icon: icon || emojiForSlug(`${r.slug} ${r.categoryId ? (byId.get(r.categoryId)?.slug ?? "") : ""}`),
      badge,
    });
    if (picked.length > 0) {
      const rows = await prisma.tool.findMany({
        where: { status: "published", slug: { in: picked.map((p) => p.toolSlug) } },
        select: toolSelect,
      });
      return picked.flatMap((p) => {
        const r = rows.find((x) => x.slug === p.toolSlug);
        return r ? [toCard(r, p.icon, p.badge, p.description)] : [];
      });
    }
    return (await autoRows()).map((r) => toCard(r, "", autoBadge(r), ""));
  }

  const popularTools = content.showPopular
    ? await toolCards(
        content.popularTools,
        () =>
          prisma.tool.findMany({
            where: { status: "published" },
            orderBy: [{ isPopular: "desc" }, { title: "asc" }],
            take: content.autoPopularCount,
            select: toolSelect,
          }),
        (r) => (r.isPopular ? content.popularAutoBadge : "")
      )
    : [];

  const trendingTools = content.showTrending
    ? await toolCards(
        content.trendingTools,
        () =>
          prisma.tool.findMany({
            where: { status: "published" },
            orderBy: { updatedAt: "desc" },
            take: content.autoTrendingCount,
            select: toolSelect,
          }),
        () => content.trendingBadge
      )
    : [];

  // Quick chips under the search — the admin's links, or popular calculators.
  let chips: D3Link[];
  if (content.heroChips.length > 0) {
    chips = content.heroChips.filter((c) => c.text.trim()).map((c) => ({ text: c.text, href: c.url || "/calculators" }));
  } else {
    const rows = await prisma.tool.findMany({
      where: { status: "published" },
      orderBy: [{ isPopular: "desc" }, { title: "asc" }],
      take: content.autoChipCount,
      select: { slug: true, title: true },
    });
    chips = rows.map((r) => ({ text: r.title.replace(/ Calculator$/i, ""), href: `/tools/${r.slug}` }));
  }

  // Category cards.
  const cardSources =
    content.categoryCards.length > 0
      ? content.categoryCards.flatMap((card) => {
          const c = bySlug.get(card.categorySlug);
          return c ? [{ c, card }] : [];
        })
      : auto.slice(0, content.autoCategoryCount).map((c) => ({ c, card: null }));
  const categoryCards: D3CategoryCard[] = await Promise.all(
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

  // Featured hub: the button goes to the first category unless a URL is set;
  // the side links are the admin's, or the next 3 categories.
  const hubButtonHref = content.hubButton.url || (auto[0] ? categoryHref(auto[0].slug) : "/calculators");
  const hubItems: D3HubItem[] =
    content.hubItems.length > 0
      ? content.hubItems
          .filter((h) => h.title.trim())
          .map((h) => ({ title: h.title, text: h.text, href: h.url || "/calculators" }))
      : await Promise.all(
          auto.slice(1, 4).map(async (c) => ({
            title: c.name,
            text: describe(c, await countFor(c.id)),
            href: categoryHref(c.slug),
          }))
        );

  // Countries — the admin's list, or every category named after a country.
  let countries: D3Country[];
  if (content.countries.length > 0) {
    countries = content.countries.flatMap((item) => {
      const c = item.categorySlug ? bySlug.get(item.categorySlug) : undefined;
      const href = c ? categoryHref(c.slug) : item.url;
      const label = item.label || c?.name || "";
      return href && label ? [{ flag: item.flag, label, href }] : [];
    });
  } else {
    countries = COUNTRIES.flatMap((country) => {
      const c = categories.find((x) => country.re.test(x.slug));
      return c ? [{ flag: country.flag, label: country.name, href: categoryHref(c.slug) }] : [];
    });
  }

  // Guides = the latest blog posts.
  const guideRows = content.showGuides
    ? await prisma.blog.findMany({
        where: { status: "published" },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        take: content.guideCount,
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
  const guides: D2Blog[] = guideRows.map((b) => ({
    slug: b.slug,
    title: b.title,
    excerpt: blogSummary(b.excerpt, b.content, b.title, content.guideExcerptWords),
    image: b.featuredImage ?? "",
    category: b.categories[0]?.name ?? "",
  }));

  const totalTools = await prisma.tool.count({ where: { status: "published" } });

  return {
    chips,
    popularTools,
    trendingTools,
    categoryCards: categoryCards.filter((c) => c.toolCount > 0),
    hubButtonHref,
    hubItems,
    countries,
    guides,
    totalTools,
    categoryCount: categories.length,
    autoCategorySlugs: auto.map((c) => c.slug),
  };
}

export type Design3Data = Awaited<ReturnType<typeof loadDesign3Data>>;
