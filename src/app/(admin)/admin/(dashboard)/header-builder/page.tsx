import { prisma } from "@/lib/prisma";
import MenuBuilder from "@/components/admin/MenuBuilder";
import AdminHelpCard from "@/components/admin/AdminHelpCard";
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
        Build the top navigation bar. Items show in the header from left to right in the order listed here. Save to
        update the live site.
      </p>
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <MenuBuilder
          location="header"
          initialItems={items}
          maxDepth={2}
          allowMega
          suggestions={suggestions}
          clearLocationOnSave={megaItems.length > 0 ? "mega-menu" : undefined}
        />
        <AdminHelpCard
          tips={[
            <>Use ↑ and ↓ to change the order — the first item shows on the left.</>,
            <>
              A normal item can have one level of dropdown links (<strong>+ Sub-item</strong>).
            </>,
            <>
              Tick <strong>Mega menu</strong> on a top-level item to turn it into a large panel: its sub-items become
              columns (<strong>+ Column</strong>), and each column&apos;s links sit under it (<strong>+ Link</strong>).
            </>,
            <>A column without links shows as a single link.</>,
            <>
              <strong>+ Add page…</strong> adds a page, calculator category or blog category in one click.
            </>,
          ]}
          link={{ href: "/", label: "View Live Site ↗" }}
        />
      </div>
    </div>
  );
}
