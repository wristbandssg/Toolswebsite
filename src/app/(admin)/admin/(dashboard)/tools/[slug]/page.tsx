import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ToolForm from "@/components/admin/ToolForm";
import type { CalcInputField, CalcResultConfig, CalcResultLineConfig } from "@/lib/calc-engine";

export default async function EditToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = await prisma.tool.findUnique({ where: { slug }, include: { seoMeta: true } });
  if (!tool) notFound();

  const categories = await prisma.toolCategory.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <h1 className="text-2xl font-bold">Edit &quot;{tool.title}&quot;</h1>
      <p className="mt-1 text-sm text-gray-500">
        <a href={`/tools/${tool.slug}`} target="_blank" className="text-indigo-600 hover:underline">
          View Live Page →
        </a>
      </p>
      <div className="mt-6">
        <ToolForm
          mode="edit"
          categories={categories}
          initial={{
            slug: tool.slug,
            title: tool.title,
            description: tool.description ?? "",
            templateKey: tool.templateKey,
            categoryId: tool.categoryId ?? "",
            status: tool.status as "draft" | "in_review" | "published" | "needs_update",
            isPopular: tool.isPopular,
            calcType: tool.calcType as "expression" | "custom",
            calcFormula: tool.calcFormula ?? "",
            calcInputs: JSON.parse(tool.calcInputs) as CalcInputField[],
            calcResult: tool.calcResult
              ? (JSON.parse(tool.calcResult) as CalcResultConfig)
              : { label: "Result", unit: "", format: "number" },
            calcResults: tool.calcResults
              ? (JSON.parse(tool.calcResults) as CalcResultLineConfig[])
              : [],
            instructions: tool.instructions ?? "",
            examples: tool.examples ?? "",
            assumptions: tool.assumptions ?? "",
            faq: tool.faq ? JSON.parse(tool.faq) : [],
            seo: {
              metaTitle: tool.seoMeta?.metaTitle ?? "",
              metaDescription: tool.seoMeta?.metaDescription ?? "",
              canonicalUrl: tool.seoMeta?.canonicalUrl ?? "",
              robotsIndex: tool.seoMeta?.robotsIndex ?? true,
              schemaType: tool.seoMeta?.schemaType ?? "",
            },
          }}
        />
      </div>
    </div>
  );
}
