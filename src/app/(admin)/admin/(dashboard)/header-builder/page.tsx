import { prisma } from "@/lib/prisma";
import MenuBuilder from "@/components/admin/MenuBuilder";
import type { MenuItem } from "@/lib/menu/types";

export const dynamic = "force-dynamic";

export default async function HeaderBuilderPage() {
  const menu = await prisma.menu.findUnique({ where: { location: "header" } });
  const items = menu ? (JSON.parse(menu.structure) as MenuItem[]) : [];

  return (
    <div>
      <h1 className="text-2xl font-bold">Header Builder</h1>
      <p className="mt-1 text-sm text-gray-500">
        Build the top navigation bar. A top-level item can have one level of dropdown links under
        it.
      </p>
      <div className="mt-6">
        <MenuBuilder location="header" initialItems={items} maxDepth={2} />
      </div>
    </div>
  );
}
