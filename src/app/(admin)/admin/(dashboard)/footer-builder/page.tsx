import { prisma } from "@/lib/prisma";
import MenuBuilder from "@/components/admin/MenuBuilder";
import type { MenuItem } from "@/lib/menu/types";

export const dynamic = "force-dynamic";

export default async function FooterBuilderPage() {
  const menu = await prisma.menu.findUnique({ where: { location: "footer" } });
  const items = menu ? (JSON.parse(menu.structure) as MenuItem[]) : [];

  return (
    <div>
      <h1 className="text-2xl font-bold">Footer Builder</h1>
      <p className="mt-1 text-sm text-gray-500">
        Build the footer columns. Each top-level item becomes a column heading, and its sub-items
        become the links inside that column.
      </p>
      <div className="mt-6">
        <MenuBuilder location="footer" initialItems={items} maxDepth={2} />
      </div>
    </div>
  );
}
