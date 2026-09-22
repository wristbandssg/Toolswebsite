import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ToolCategoriesManager from "@/components/admin/ToolCategoriesManager";

export default async function ToolCategoriesPage() {
  const categories = await prisma.toolCategory.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { tools: true } } },
  });

  return (
    <div>
      <p className="text-sm text-gray-500">
        <Link href="/admin/tools" className="hover:underline">
          Tools
        </Link>{" "}
        / Categories
      </p>
      <h1 className="mt-1 text-2xl font-bold">Tool Categories</h1>
      <p className="mt-1 text-sm text-gray-500">
        Add, rename, or remove the categories Tools can be filed under. Each one gets its own
        public listing page.
      </p>
      <div className="mt-6">
        <ToolCategoriesManager
          initial={categories.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            toolCount: c._count.tools,
          }))}
        />
      </div>
    </div>
  );
}
