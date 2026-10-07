import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CategoryContentForm from "@/components/admin/CategoryContentForm";
import { blogCategoryUrl } from "@/lib/urls";

export const dynamic = "force-dynamic";

export default async function BlogCategoryContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9]{24}$/i.test(id)) notFound();
  const category = await prisma.blogCategory.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true, content: true },
  });
  if (!category) notFound();

  return (
    <div>
      <p className="text-sm text-gray-500">
        <Link href="/admin/blogs" className="hover:underline">
          Blog
        </Link>{" "}
        /{" "}
        <Link href="/admin/blogs/categories" className="hover:underline">
          Categories
        </Link>{" "}
        / Content
      </p>
      <h1 className="mt-1 text-2xl font-bold">Content — {category.name}</h1>
      <p className="mt-1 max-w-2xl text-sm text-gray-500">
        This article shows on the public category page, under the list of posts. Use headings, lists, tables, links and
        images. Leave it empty to show no content section.
      </p>
      <div className="mt-6">
        <CategoryContentForm
          saveUrl={`/api/blog-categories/${category.id}/content`}
          publicHref={blogCategoryUrl(category.slug)}
          initial={category.content ?? ""}
        />
      </div>
    </div>
  );
}
