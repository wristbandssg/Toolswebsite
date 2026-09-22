import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PageBuilder from "@/components/admin/PageBuilder";
import { PAGE_TEMPLATES } from "@/lib/templates/registry";
import type { PageSection } from "@/lib/templates/page/types";

export const dynamic = "force-dynamic";

export default async function EditPagePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await prisma.page.findUnique({ where: { slug } });
  if (!page) notFound();

  const tools = await prisma.tool.findMany({
    orderBy: { title: "asc" },
    select: { slug: true, title: true },
  });

  const templates = Object.entries(PAGE_TEMPLATES).map(([key, t]) => ({ key, name: t.name }));

  return (
    <div>
      <h1 className="text-2xl font-bold">Edit &quot;{page.title}&quot;</h1>
      <p className="mt-1 text-sm text-gray-500">
        <a href={`/pages/${page.slug}`} target="_blank" className="text-indigo-600 hover:underline">
          View Live Page →
        </a>
      </p>
      <div className="mt-6">
        <PageBuilder
          mode="edit"
          templates={templates}
          tools={tools}
          initial={{
            slug: page.slug,
            title: page.title,
            templateKey: page.templateKey,
            sections: JSON.parse(page.sections) as PageSection[],
            status: page.status as "draft" | "in_review" | "published" | "needs_update",
          }}
        />
      </div>
    </div>
  );
}
