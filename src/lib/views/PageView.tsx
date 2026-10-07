import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getPageTemplate } from "@/lib/templates/registry";
import type { PageSection } from "@/lib/templates/page/types";
import { buildSeoMetadata } from "@/lib/seo";
import { pageUrl } from "@/lib/urls";
import { getCategoryIndex } from "@/lib/category-index";

// Public normal page, served at /{page}/ — see src/app/(site)/[first].

/** Published pages are public; a logged-in admin can also preview unpublished ones (the admin's "View Page"). */
export async function loadPage(slug: string) {
  const page = await prisma.page.findUnique({
    where: { slug },
    include: { seoMeta: true },
  });
  if (!page) return null;
  if (page.status === "published") return { page, preview: false };
  const session = await auth();
  return session?.user ? { page, preview: true } : null;
}

export async function pageMetadata(slug: string): Promise<Metadata> {
  const data = await loadPage(slug);
  if (!data) return {};
  const meta = buildSeoMetadata({
    seoMeta: data.page.seoMeta,
    fallbackTitle: data.page.title,
    path: pageUrl(data.page.slug),
  });
  // Never let a draft preview be indexed.
  return data.preview ? { ...meta, robots: { index: false, follow: false } } : meta;
}

export default async function PageView({ slug }: { slug: string }) {
  const data = await loadPage(slug);
  if (!data) notFound();
  const { page, preview } = data;

  const { component: Template } = getPageTemplate(page.templateKey);

  // Calculator links inside the page need the calculator's current URL.
  const sections = JSON.parse(page.sections) as PageSection[];
  const embedSlugs = sections.flatMap((s) => (s.type === "calculator_embed" && s.toolSlug ? [s.toolSlug] : []));
  if (embedSlugs.length > 0) {
    const [tools, index] = await Promise.all([
      prisma.tool.findMany({ where: { slug: { in: embedSlugs }, status: "published" }, select: { slug: true, categoryId: true } }),
      getCategoryIndex(),
    ]);
    const hrefBySlug = new Map(tools.map((t) => [t.slug, index.toolHref(t)]));
    for (const s of sections) if (s.type === "calculator_embed") s.toolHref = hrefBySlug.get(s.toolSlug);
  }

  return (
    <>
      {preview ? (
        <div className="bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-900">
          Preview — this page is <strong>{page.status.replace("_", " ")}</strong> and only visible to logged-in admins.
          Set its status to Published to make it public.
        </div>
      ) : null}
      <Template
        page={{
          slug: page.slug,
          title: page.title,
          sections,
        }}
      />
    </>
  );
}
