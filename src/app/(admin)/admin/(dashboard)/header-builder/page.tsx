import { prisma } from "@/lib/prisma";
import MenuBuilder from "@/components/admin/MenuBuilder";
import type { MenuItem } from "@/lib/menu/types";
import { DEFAULT_HEADER_ITEMS } from "@/lib/menu/defaults";
import { getLinkSuggestions } from "@/lib/menu/suggestions";

export const dynamic = "force-dynamic";

function parse(structure: string | undefined): MenuItem[] {
  try {
    return structure ? (JSON.parse(structure) as MenuItem[]) : [];
  } catch {
    return [];
  }
}

export default async function HeaderBuilderPage() {
  const [header, legacyMega, suggestions] = await Promise.all([
    prisma.menu.findUnique({ where: { location: "header" } }),
    prisma.menu.findUnique({ where: { location: "mega-menu" } }),
    getLinkSuggestions(),
  ]);
  const headerItems = parse(header?.structure);
  // Mega menus used to be built on a separate page; their items now live in
  // the header list (marked as mega menus). Saving here moves them over and
  // empties the old list.
  const megaItems = parse(legacyMega?.structure).map((item) => ({ ...item, mega: true }));
  const items = [...(headerItems.length > 0 ? headerItems : DEFAULT_HEADER_ITEMS), ...megaItems];

  return (
    <div>
      <h1 className="text-2xl font-bold">Header Builder</h1>
      <p className="mt-1 max-w-3xl text-sm text-gray-500">
        Build the top navigation bar. Items show in the header from left to right in the order listed here — use ↑ and
        ↓ to change the order. A normal item can have one level of dropdown links. Tick <strong>Mega menu</strong> on a
        top-level item to turn it into a large panel: its sub-items become columns, and each column&apos;s links sit
        under it (a column without links becomes a single link). Save to update the live site.
      </p>
      <div className="mt-6">
        <MenuBuilder
          location="header"
          initialItems={items}
          maxDepth={2}
          allowMega
          suggestions={suggestions}
          clearLocationOnSave={megaItems.length > 0 ? "mega-menu" : undefined}
        />
      </div>
    </div>
  );
}
