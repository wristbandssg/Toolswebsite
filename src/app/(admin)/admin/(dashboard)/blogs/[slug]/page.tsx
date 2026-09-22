import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import BlogForm from "@/components/admin/BlogForm";

export default async function EditBlogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const blog = await prisma.blog.findUnique({
    where: { slug },
    include: {
      toolRelations: true,
      relatedFrom: true,
    },
  });
  if (!blog) notFound();

  const [categories, tools, otherBlogs] = await Promise.all([
    prisma.blogCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.tool.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.blog.findMany({
      where: { NOT: { id: blog.id } },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Edit &quot;{blog.title}&quot;</h1>
      <p className="mt-1 text-sm text-gray-500">
        <a href={`/blog/${blog.slug}`} target="_blank" className="text-indigo-600 hover:underline">
          View Live Page →
        </a>
      </p>
      <div className="mt-6">
        <BlogForm
          mode="edit"
          categories={categories}
          tools={tools}
          otherBlogs={otherBlogs}
          initial={{
            slug: blog.slug,
            title: blog.title,
            featuredImage: blog.featuredImage ?? "",
            content: blog.content,
            tags: (JSON.parse(blog.tags) as string[]).join(", "),
            status: blog.status as "draft" | "in_review" | "published" | "needs_update",
            publishedAt: blog.publishedAt ? blog.publishedAt.toISOString().slice(0, 10) : "",
            categoryId: blog.categoryId ?? "",
            newCategoryName: "",
            toolIds: blog.toolRelations.map((r) => r.toolId),
            relatedBlogIds: blog.relatedFrom.map((r) => r.relatedBlogId),
          }}
        />
      </div>
    </div>
  );
}
