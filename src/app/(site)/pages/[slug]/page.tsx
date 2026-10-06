import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getPageTemplate } from "@/lib/templates/registry";
import type { PageSection } from "@/lib/templates/page/types";
import { buildSeoMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

/** Published pages are public; a logged-in admin can also preview unpublished ones (the admin's "View Page"). */
async function loadPage(slug: string) {
  const page = await prisma.page.findUnique({
    where: { slug },
    include: { seoMeta: true },
  });
  if (!page) return null;
  if (page.status === "published") return { page, preview: false };
  const session = await auth();
  return session?.user ? { page, preview: true } : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadPage(slug);
  if (!data) return {};
  const meta = buildSeoMetadata({
    seoMeta: data.page.seoMeta,
    fallbackTitle: data.page.title,
    path: `/pages/${data.page.slug}`,
  });
  // Never let a draft preview be indexed.
  return data.preview ? { ...meta, robots: { index: false, follow: false } } : meta;
}

export default async function CustomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await loadPage(slug);
  if (!data) notFound();
  const { page, preview } = data;

  const { component: Template } = getPageTemplate(page.templateKey);

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
          sections: JSON.parse(page.sections) as PageSection[],
        }}
      />
    </>
  );
}
