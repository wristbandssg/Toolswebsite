import { prisma } from "@/lib/prisma";
import BlogForm from "@/components/admin/BlogForm";

export default async function NewBlogPage() {
  const [categories, tools, otherBlogs] = await Promise.all([
    prisma.blogCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.tool.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.blog.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold">নতুন Blog Post</h1>
      <p className="mt-1 text-sm text-gray-500">
        Content লিখুন, Category বেছে নিন, এবং প্রয়োজনে Tool/Related Blog-এর সাথে যুক্ত করুন।
      </p>
      <div className="mt-6">
        <BlogForm
          mode="create"
          categories={categories}
          tools={tools}
          otherBlogs={otherBlogs}
        />
      </div>
    </div>
  );
}
