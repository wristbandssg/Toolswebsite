import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ToolsList from "@/components/admin/ToolsList";

export default async function ToolsListPage() {
  const [tools, categories] = await Promise.all([
    prisma.tool.findMany({
      orderBy: { updatedAt: "desc" },
      include: { category: true },
    }),
    prisma.toolCategory.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tools</h1>
          <p className="mt-1 text-sm text-gray-500">Create and edit all your calculator tools here.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/tools/categories"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Manage Categories
          </Link>
          <Link
            href="/admin/tools/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + New Tool
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <ToolsList
          tools={tools.map((tool) => ({
            id: tool.id,
            slug: tool.slug,
            title: tool.title,
            status: tool.status,
            templateKey: tool.templateKey,
            updatedAtLabel: tool.updatedAt.toLocaleDateString(),
            category: tool.category ? { id: tool.category.id, name: tool.category.name } : null,
          }))}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        />
      </div>
    </div>
  );
}
