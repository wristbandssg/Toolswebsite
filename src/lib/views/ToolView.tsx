import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getToolTemplate } from "@/lib/templates/registry";
import type { CalcInputField, CalcResultConfig, CalcResultLineConfig } from "@/lib/calc-engine";
import { buildSeoMetadata } from "@/lib/seo";
import { resolveAuthorProfile } from "@/lib/authors";
import { getCategoryIndex } from "@/lib/category-index";

// Public calculator page, served at /{category}/{calculator}/ — see
// src/app/(site)/[first]/[second]. Only published calculators are public.

export async function loadPublishedTool(slug: string) {
  const tool = await prisma.tool.findUnique({
    where: { slug },
    include: {
      category: true,
      authorProfile: true,
      seoMeta: true,
      blogRelations: { include: { blog: true } },
    },
  });
  if (!tool || tool.status !== "published") return null;
  return tool;
}

export async function toolMetadata(slug: string): Promise<Metadata> {
  const tool = await loadPublishedTool(slug);
  if (!tool) return {};
  const index = await getCategoryIndex();
  return buildSeoMetadata({
    seoMeta: tool.seoMeta,
    fallbackTitle: tool.title,
    fallbackDescription: tool.description,
    path: index.toolHref(tool),
  });
}

export default async function ToolView({ slug }: { slug: string }) {
  const tool = await loadPublishedTool(slug);
  if (!tool) notFound();
  const index = await getCategoryIndex();

  const relatedTools = await prisma.tool.findMany({
    where: { categoryId: tool.categoryId ?? undefined, NOT: { id: tool.id }, status: "published" },
    take: 6,
    select: { slug: true, title: true, categoryId: true },
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
  // Only states whose calculator is actually live get a link.
  const stateToolRows = stateCalculators.some((s) => s.toolSlug)
    ? await prisma.tool.findMany({
        where: { status: "published", slug: { in: stateCalculators.flatMap((s) => (s.toolSlug ? [s.toolSlug] : [])) } },
        select: { slug: true, categoryId: true },
      })
    : [];
  const stateHref = new Map(stateToolRows.map((t) => [t.slug, index.toolHref(t)]));

  const breadcrumbs = [
    { name: "Home", href: "/" },
    ...(tool.categoryId ? index.chainOf(tool.categoryId) : []).map((c) => ({ name: index.crumbName(c.id), href: index.categoryHref(c.id) })),
    { name: tool.title, href: index.toolHref(tool) },
  ];

  const authorProfile = await resolveAuthorProfile(tool.authorProfile);
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
        assumptions: tool.assumptions,
        faq: tool.faq ? JSON.parse(tool.faq) : [],
        categoryName: tool.category?.name,
        categorySlug: tool.category?.slug,
      }}
      breadcrumbs={breadcrumbs}
      relatedTools={relatedTools.map((t) => ({ slug: t.slug, title: t.title, href: index.toolHref(t) }))}
      authorProfile={authorProfile}
      supportBlogs={tool.blogRelations
        // A linked post that is still a draft would be a dead link.
        .filter((r) => r.blog.status === "published")
        .map((r) => ({ slug: r.blog.slug, title: r.blog.title }))}
      stateCalculators={stateCalculators.map((s) => ({
        stateName: s.stateName,
        abbreviation: s.abbreviation,
        toolSlug: s.toolSlug,
        href: s.toolSlug ? (stateHref.get(s.toolSlug) ?? null) : null,
      }))}
    />
  );
}
