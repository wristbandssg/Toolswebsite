import Link from "next/link";
import { prisma } from "@/lib/prisma";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  published: "Published",
  needs_update: "Needs Update",
};

export default async function ToolsListPage() {
  const tools = await prisma.tool.findMany({
    orderBy: { updatedAt: "desc" },
    include: { category: true },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calculator Tools</h1>
          <p className="mt-1 text-sm text-gray-500">সব Tool এখান থেকে Create/Edit করুন।</p>
        </div>
        <Link
          href="/admin/tools/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + নতুন Tool
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 dark:bg-gray-950">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Template</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {tools.map((tool) => (
              <tr key={tool.id}>
                <td className="px-4 py-3 font-medium">{tool.title}</td>
                <td className="px-4 py-3 text-gray-500">{tool.category?.name ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500">{tool.templateKey}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800">
                    {STATUS_LABEL[tool.status] ?? tool.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {tool.updatedAt.toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/tools/${tool.slug}`} className="text-indigo-600 hover:underline">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {tools.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  এখনো কোনো Tool তৈরি হয়নি।
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
