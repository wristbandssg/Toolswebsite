import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CategoryContentForm from "@/components/admin/CategoryContentForm";
import { getCategoryIndex } from "@/lib/category-index";

export const dynamic = "force-dynamic";

export default async function CategoryContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9]{24}$/i.test(id)) notFound();
  const category = await prisma.toolCategory.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true, content: true },
  });
  if (!category) notFound();

  return (
    <div>
      <p className="text-sm text-gray-500">
        <Link href="/admin/tools" className="hover:underline">
          Calculators
        </Link>{" "}
        /{" "}
        <Link href="/admin/tools/categories" className="hover:underline">
          Categories
        </Link>{" "}
        / Content
      </p>
      <h1 className="mt-1 text-2xl font-bold">Content — {category.name}</h1>
      <p className="mt-1 max-w-2xl text-sm text-gray-500">
        This article shows on the public category page, under the sub-categories and calculators. Use headings, lists,
        tables, links and images — 1,500+ words works well for SEO. Leave it empty to show no content section.
      </p>
      <div className="mt-6">
        <CategoryContentForm id={category.id} publicHref={(await getCategoryIndex()).categoryHref(category.id)} initial={category.content ?? ""} />
      </div>
    </div>
  );
}
