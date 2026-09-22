import { prisma } from "@/lib/prisma";
import MenuBuilder from "@/components/admin/MenuBuilder";
import type { MenuItem } from "@/lib/menu/types";

export const dynamic = "force-dynamic";

export default async function MegaMenuPage() {
  const menu = await prisma.menu.findUnique({ where: { location: "mega-menu" } });
  const items = menu ? (JSON.parse(menu.structure) as MenuItem[]) : [];

  return (
    <div>
      <h1 className="text-2xl font-bold">Mega Menu Builder</h1>
      <p className="mt-1 text-sm text-gray-500">
        Build a large dropdown panel that appears in the header. A top-level item is the trigger
        (e.g. &quot;Tools&quot;). Its sub-items become columns in the panel, and each column&apos;s
        own sub-items become the links inside that column — a sub-item left without links becomes
        a single link instead.
      </p>
      <div className="mt-6">
        <MenuBuilder location="mega-menu" initialItems={items} maxDepth={3} />
      </div>
    </div>
  );
}
