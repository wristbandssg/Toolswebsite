import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ToolForm from "@/components/admin/ToolForm";
import type { CalcInputField, CalcResultConfig } from "@/lib/calc-engine";

export default async function EditToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = await prisma.tool.findUnique({ where: { slug } });
  if (!tool) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold">{tool.title} Edit করুন</h1>
      <p className="mt-1 text-sm text-gray-500">
        <a href={`/tools/${tool.slug}`} target="_blank" className="text-indigo-600 hover:underline">
          Live Page দেখুন →
        </a>
      </p>
      <div className="mt-6">
        <ToolForm
          mode="edit"
          initial={{
            slug: tool.slug,
            title: tool.title,
            description: tool.description ?? "",
            templateKey: tool.templateKey,
            status: tool.status as "draft" | "in_review" | "published" | "needs_update",
            calcType: tool.calcType as "expression" | "custom",
            calcFormula: tool.calcFormula ?? "",
            calcInputs: JSON.parse(tool.calcInputs) as CalcInputField[],
            calcResult: tool.calcResult
              ? (JSON.parse(tool.calcResult) as CalcResultConfig)
              : { label: "Result", unit: "", format: "number" },
            instructions: tool.instructions ?? "",
            examples: tool.examples ?? "",
            faq: tool.faq ? JSON.parse(tool.faq) : [],
          }}
        />
      </div>
    </div>
  );
}
