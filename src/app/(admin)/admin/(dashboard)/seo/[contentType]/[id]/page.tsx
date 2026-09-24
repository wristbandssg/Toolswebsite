import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SeoForm from "@/components/admin/SeoForm";
import { SEO_CONTENT_TYPES, type SeoContentType } from "@/lib/seo";

export const dynamic = "force-dynamic";

async function loadContent(contentType: SeoContentType, id: string) {
  if (contentType === "tool") {
    const tool = await prisma.tool.findUnique({ where: { id }, include: { seoMeta: true } });
    if (!tool) return null;
    return {
      title: tool.title,
      publicHref: `/tools/${tool.slug}`,
      fallbackDescription: tool.description ?? undefined,
      seoMeta: tool.seoMeta,
    };
  }
  if (contentType === "blog") {
    const blog = await prisma.blog.findUnique({ where: { id }, include: { seoMeta: true } });
    if (!blog) return null;
    return {
      title: blog.title,
      publicHref: `/blog/${blog.slug}`,
      fallbackDescription: undefined,
      seoMeta: blog.seoMeta,
    };
  }
  if (contentType === "tool_category") {
    const category = await prisma.toolCategory.findUnique({
      where: { id },
      include: { seoMeta: true },
    });
    if (!category) return null;
    return {
      title: category.name,
      publicHref: `/tools/category/${category.slug}`,
      fallbackDescription: category.heroDescription ?? category.heroSubheading ?? undefined,
      seoMeta: category.seoMeta,
    };
  }
  const page = await prisma.page.findUnique({ where: { id }, include: { seoMeta: true } });
  if (!page) return null;
  return {
    title: page.title,
    publicHref: `/pages/${page.slug}`,
    fallbackDescription: undefined,
    seoMeta: page.seoMeta,
  };
}

export default async function EditSeoPage({
  params,
}: {
  params: Promise<{ contentType: string; id: string }>;
}) {
  const { contentType, id } = await params;
  if (!SEO_CONTENT_TYPES.includes(contentType as SeoContentType)) notFound();
  const type = contentType as SeoContentType;

  const content = await loadContent(type, id);
  if (!content) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold">SEO — {content.title}</h1>
      <p className="mt-1 text-sm text-gray-500">
        <a href={content.publicHref} target="_blank" className="text-indigo-600 hover:underline">
          View Live Page →
        </a>
      </p>
      <div className="mt-6">
        <SeoForm
          contentType={type}
          id={id}
          backHref={type === "tool_category" ? "/admin/tools/categories" : "/admin/seo"}
          fallbackTitle={content.title}
          fallbackDescription={content.fallbackDescription}
          initial={{
            metaTitle: content.seoMeta?.metaTitle ?? "",
            metaDescription: content.seoMeta?.metaDescription ?? "",
            canonicalUrl: content.seoMeta?.canonicalUrl ?? "",
            ogImage: content.seoMeta?.ogImage ?? "",
            robotsIndex: content.seoMeta?.robotsIndex ?? true,
            schemaType: content.seoMeta?.schemaType ?? "",
          }}
        />
      </div>
    </div>
  );
}
