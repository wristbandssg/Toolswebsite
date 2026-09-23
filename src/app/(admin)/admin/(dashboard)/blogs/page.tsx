import Link from "next/link";
import { prisma } from "@/lib/prisma";
import BlogPostsList from "@/components/admin/BlogPostsList";

export default async function BlogsListPage() {
  const [blogs, categories] = await Promise.all([
    prisma.blog.findMany({
      orderBy: { updatedAt: "desc" },
      include: { categories: true, toolRelations: true },
    }),
    prisma.blogCategory.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Blog Posts</h1>
          <p className="mt-1 text-sm text-gray-500">Create and edit all your blog posts here.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/blogs/categories"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Manage Categories
          </Link>
          <Link
            href="/admin/blogs/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            + New Blog Post
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <BlogPostsList
          posts={blogs.map((blog) => ({
            id: blog.id,
            slug: blog.slug,
            title: blog.title,
            status: blog.status,
            updatedAtLabel: blog.updatedAt.toLocaleDateString(),
            categories: blog.categories.map((c) => ({ id: c.id, name: c.name })),
            toolCount: blog.toolRelations.length,
          }))}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        />
      </div>
    </div>
  );
}
