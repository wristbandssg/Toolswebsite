import Link from "next/link";
import { prisma } from "@/lib/prisma";

// Blog List সবসময় সর্বশেষ Published Post দেখাবে — তাই Build-time Static Prerender
// বন্ধ রাখা হলো (Admin Dashboard-এর মতো একই কারণ, দেখুন সেই layout.tsx-এর কমেন্ট)।
export const dynamic = "force-dynamic";

export default async function BlogListPage() {
  const blogs = await prisma.blog.findMany({
    where: { status: "published" },
    orderBy: { publishedAt: "desc" },
    include: { category: true },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold">Blog</h1>
      <p className="mt-1 text-gray-500">সব Article এখানে দেখুন।</p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {blogs.map((blog) => (
          <div
            key={blog.id}
            className="rounded-2xl border border-gray-200 p-5 hover:border-indigo-300 dark:border-gray-800"
          >
            {blog.category ? (
              <Link
                href={`/blog/category/${blog.category.slug}`}
                className="text-xs font-medium text-indigo-600 hover:underline"
              >
                {blog.category.name}
              </Link>
            ) : null}
            <Link href={`/blog/${blog.slug}`} className="block">
              <h2 className="mt-1 text-lg font-semibold">{blog.title}</h2>
              {blog.excerpt ? (
                <p className="mt-1 line-clamp-2 text-sm text-gray-500">{blog.excerpt}</p>
              ) : null}
              {blog.publishedAt ? (
                <p className="mt-2 text-sm text-gray-500">
                  {blog.publishedAt.toLocaleDateString()}
                </p>
              ) : null}
            </Link>
          </div>
        ))}
        {blogs.length === 0 ? (
          <p className="text-gray-400">এখনো কোনো Blog Post Publish হয়নি।</p>
        ) : null}
      </div>
    </div>
  );
}
