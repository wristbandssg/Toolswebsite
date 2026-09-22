import { prisma } from "@/lib/prisma";
import PageBuilder from "@/components/admin/PageBuilder";
import { PAGE_TEMPLATES } from "@/lib/templates/registry";

export const dynamic = "force-dynamic";

export default async function NewPagePage() {
  const tools = await prisma.tool.findMany({
    orderBy: { title: "asc" },
    select: { slug: true, title: true },
  });

  const templates = Object.entries(PAGE_TEMPLATES).map(([key, t]) => ({ key, name: t.name }));

  return (
    <div>
      <h1 className="text-2xl font-bold">New Page</h1>
      <p className="mt-1 text-sm text-gray-500">
        Pick a template, then add and arrange sections to build the page.
      </p>
      <div className="mt-6">
        <PageBuilder mode="create" templates={templates} tools={tools} />
      </div>
    </div>
  );
}
