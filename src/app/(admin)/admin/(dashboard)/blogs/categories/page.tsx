import Link from "next/link";
import { prisma } from "@/lib/prisma";
import BlogCategoriesManager from "@/components/admin/BlogCategoriesManager";

export default async function BlogCategoriesPage() {
  const categories = await prisma.blogCategory.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { blogs: true } } },
  });

  return (
    <div>
      <p className="text-sm text-gray-500">
        <Link href="/admin/blogs" className="hover:underline">
          Blog Posts
        </Link>{" "}
        / Categories
      </p>
      <h1 className="mt-1 text-2xl font-bold">Blog Categories</h1>
      <p className="mt-1 text-sm text-gray-500">
        Add, rename, or remove the categories blog posts can be filed under. Each one gets its
        own public page.
      </p>
      <div className="mt-6">
        <BlogCategoriesManager
          initial={categories.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            postCount: c._count.blogs,
          }))}
        />
      </div>
    </div>
  );
}
