import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getPageTemplate } from "@/lib/templates/registry";
import type { PageSection } from "@/lib/templates/page/types";
import { buildSeoMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

async function loadPage(slug: string) {
  const page = await prisma.page.findUnique({
    where: { slug },
    include: { seoMeta: true },
  });
  if (!page || page.status !== "published") return null;
  return page;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await loadPage(slug);
  if (!page) return {};
  return buildSeoMetadata({
    seoMeta: page.seoMeta,
    fallbackTitle: page.title,
    path: `/pages/${page.slug}`,
  });
}

export default async function CustomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await loadPage(slug);
  if (!page) notFound();

  const { component: Template } = getPageTemplate(page.templateKey);

  return (
    <Template
      page={{
        slug: page.slug,
        title: page.title,
        sections: JSON.parse(page.sections) as PageSection[],
      }}
    />
  );
}
