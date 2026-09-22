import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { buildSeoMetadata } from "@/lib/seo";

// ক্যাটাগরি পেজও সবসময় সর্বশেষ Published Post দেখাবে, তাই Blog List-এর মতোই
// Build-time Static Prerender বন্ধ রাখা হলো।
export const dynamic = "force-dynamic";

async function loadCategory(slug: string) {
  const category = await prisma.blogCategory.findUnique({ where: { slug } });
  if (!category) return null;
  const blogs = await prisma.blog.findMany({
    where: { status: "published", categoryId: category.id },
    orderBy: { publishedAt: "desc" },
    include: { category: true },
  });
  return { category, blogs };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadCategory(slug);
  if (!data) return {};
  return buildSeoMetadata({
    fallbackTitle: `${data.category.name} — Blog`,
    fallbackDescription: `${data.category.name} বিষয়ক সব Article এখানে দেখুন।`,
    path: `/blog/category/${data.category.slug}`,
  });
}

export default async function BlogCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await loadCategory(slug);
  if (!data) notFound();
  const { category, blogs } = data;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <p className="text-sm text-gray-500">
        <Link href="/blog" className="hover:underline">
          Blog
        </Link>{" "}
        / {category.name}
      </p>
      <h1 className="mt-1 text-3xl font-bold">{category.name}</h1>
      <p className="mt-1 text-gray-500">{category.name} বিষয়ক সব Article এখানে দেখুন।</p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {blogs.map((blog) => (
          <Link
            key={blog.id}
            href={`/blog/${blog.slug}`}
            className="rounded-2xl border border-gray-200 p-5 hover:border-indigo-300 dark:border-gray-800"
          >
            {blog.category ? (
              <span className="text-xs font-medium text-indigo-600">{blog.category.name}</span>
            ) : null}
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
        ))}
        {blogs.length === 0 ? (
          <p className="text-gray-400">এই ক্যাটাগরিতে এখনো কোনো Blog Post Publish হয়নি।</p>
        ) : null}
      </div>
    </div>
  );
}
