import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getToolTemplate } from "@/lib/templates/registry";
import type { CalcInputField, CalcResultConfig, CalcResultLineConfig } from "@/lib/calc-engine";
import { buildSeoMetadata } from "@/lib/seo";

async function loadTool(slug: string) {
  const tool = await prisma.tool.findUnique({
    where: { slug },
    include: {
      category: true,
      seoMeta: true,
      blogRelations: { include: { blog: true } },
    },
  });
  if (!tool || tool.status !== "published") return null;
  return tool;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = await loadTool(slug);
  if (!tool) return {};
  return buildSeoMetadata({
    seoMeta: tool.seoMeta,
    fallbackTitle: tool.title,
    fallbackDescription: tool.description,
    path: `/tools/${tool.slug}`,
  });
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = await loadTool(slug);
  if (!tool) notFound();

  const relatedTools = await prisma.tool.findMany({
    where: { categoryId: tool.categoryId ?? undefined, NOT: { id: tool.id }, status: "published" },
    take: 6,
    select: { slug: true, title: true },
  });

  // "Other state calculators" grid — only relevant for tools in the state
  // tax/paycheck calculator family, so it's gated on category slug rather
  // than shown on every tool page. The current tool's own state is filtered
  // out (it's the "OTHER state calculators" list, not this one).
  const stateCalculators =
    tool.category?.slug === "tax-paycheck-calculators"
      ? (await prisma.stateCalculatorLink.findMany({ orderBy: { order: "asc" } })).filter(
          (s) => s.toolSlug !== tool.slug
        )
      : [];

  const { component: Template } = getToolTemplate(tool.templateKey);

  return (
    <Template
      tool={{
        id: tool.id,
        slug: tool.slug,
        title: tool.title,
        description: tool.description,
        calcType: tool.calcType as "expression" | "custom",
        calcFormula: tool.calcFormula,
        calcInputs: JSON.parse(tool.calcInputs) as CalcInputField[],
        calcResult: tool.calcResult ? (JSON.parse(tool.calcResult) as CalcResultConfig) : null,
        calcResults: tool.calcResults
          ? (JSON.parse(tool.calcResults) as CalcResultLineConfig[])
          : null,
        instructions: tool.instructions,
        examples: tool.examples,
        faq: tool.faq ? JSON.parse(tool.faq) : [],
        categoryName: tool.category?.name,
      }}
      relatedTools={relatedTools}
      supportBlogs={tool.blogRelations.map((r) => ({ slug: r.blog.slug, title: r.blog.title }))}
      stateCalculators={stateCalculators.map((s) => ({
        stateName: s.stateName,
        abbreviation: s.abbreviation,
        toolSlug: s.toolSlug,
      }))}
    />
  );
}
