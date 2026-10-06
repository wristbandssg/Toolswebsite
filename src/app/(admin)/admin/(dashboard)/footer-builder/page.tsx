import { prisma } from "@/lib/prisma";
import MenuBuilder from "@/components/admin/MenuBuilder";
import FooterSettingsForm from "@/components/admin/FooterSettingsForm";
import type { MenuItem } from "@/lib/menu/types";
import { DEFAULT_FOOTER_COLUMNS } from "@/lib/menu/defaults";
import { getLinkSuggestions } from "@/lib/menu/suggestions";
import { getFooterSettings } from "@/lib/footer-config";
import { getSiteGeneralSettings } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export default async function FooterBuilderPage() {
  const [menu, footerSettings, site, suggestions] = await Promise.all([
    prisma.menu.findUnique({ where: { location: "footer" } }),
    getFooterSettings(),
    getSiteGeneralSettings(),
    getLinkSuggestions(),
  ]);
  let items: MenuItem[] = [];
  try {
    items = menu ? (JSON.parse(menu.structure) as MenuItem[]) : [];
  } catch {
    items = [];
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Footer Builder</h1>
      <p className="mt-1 max-w-3xl text-sm text-gray-500">
        Set the footer&apos;s colors, brand column, social links and copyright line, then build its link columns below.
      </p>

      <div className="mt-6">
        <FooterSettingsForm initial={footerSettings} siteName={site.siteName} />
      </div>

      <h2 className="mt-10 text-lg font-bold">Link Columns</h2>
      <p className="mt-1 max-w-3xl text-sm text-gray-500">
        Each top-level item is a column heading; its sub-items are the links in that column. Columns show left to right
        in this order — use ↑ and ↓ to reorder. Use <strong>+ Add page…</strong> on a column to add any published page,
        calculator category or blog category in one click, or type your own link (including mailto: for email).
      </p>
      <div className="mt-4">
        <MenuBuilder
          location="footer"
          initialItems={items.length > 0 ? items : DEFAULT_FOOTER_COLUMNS}
          maxDepth={2}
          suggestions={suggestions}
        />
      </div>
    </div>
  );
}
