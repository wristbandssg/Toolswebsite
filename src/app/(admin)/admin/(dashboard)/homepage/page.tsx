import { prisma } from "@/lib/prisma";
import { getHomepageSettings } from "@/lib/homepage-config";
import { loadDesign1Data } from "@/lib/homepage-data";
import { groupCategoryTree } from "@/lib/flattenCategoryTree";
import HomepageSettingsForm from "@/components/admin/HomepageSettingsForm";

export const dynamic = "force-dynamic";

export default async function HomepageSettingsPage() {
  const [settings, categories] = await Promise.all([
    getHomepageSettings(),
    prisma.toolCategory.findMany({
      select: { id: true, name: true, slug: true, parentId: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const slugById = new Map(categories.map((c) => [c.id, c.slug]));
  const categoryGroups = groupCategoryTree(categories).map((g) => ({
    label: g.label,
    options: g.options.map((o) => ({ slug: slugById.get(o.id) ?? "", name: o.name })),
  }));
  // What "automatic" currently shows, so the admin can start from it.
  const auto = await loadDesign1Data({ ...settings.design1, iconItems: [], sections: [], autoSectionCount: 30 });

  return (
    <div>
      <h1 className="text-2xl font-bold">Home Page</h1>
      <p className="mt-1 max-w-3xl text-sm text-gray-500">
        Choose which home page design is live and edit everything on it — headings, text, the calculator and search,
        category tiles, calculator sections, and the &quot;Featured In&quot; logos. Changes show on the live home page as
        soon as you save.
      </p>
      <div className="mt-6">
        <HomepageSettingsForm
          initial={settings}
          categoryGroups={categoryGroups}
          autoTileSlugs={auto.tiles.map((t) => t.slug)}
          autoSectionSlugs={auto.sections.map((s) => s.slug)}
        />
      </div>
    </div>
  );
}
