import Link from "next/link";
import { prisma } from "@/lib/prisma";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  published: "Published",
  needs_update: "Needs Update",
};

export default async function BlogsListPage() {
  const blogs = await prisma.blog.findMany({
    orderBy: { updatedAt: "desc" },
    include: { category: true, toolRelations: true },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Blog Posts</h1>
          <p className="mt-1 text-sm text-gray-500">Create and edit all your blog posts here.</p>
        </div>
        <Link
          href="/admin/blogs/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + New Blog Post
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 dark:bg-gray-950">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Linked Tools</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {blogs.map((blog) => (
              <tr key={blog.id}>
                <td className="px-4 py-3 font-medium">{blog.title}</td>
                <td className="px-4 py-3 text-gray-500">{blog.category?.name ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500">{blog.toolRelations.length}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800">
                    {STATUS_LABEL[blog.status] ?? blog.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {blog.updatedAt.toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/blogs/${blog.slug}`} className="text-indigo-600 hover:underline">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {blogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No blog posts yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
