import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { buildSeoMetadata } from "@/lib/seo";

// Always reflect the latest published tools for this category.
export const dynamic = "force-dynamic";

// A distinct visual identity from the Blog category page: a light hero
// section with a gradient-accented headline (rather than a colored banner)
// followed by a grid of compact, icon-free tool cards — title, description,
// and an optional "POPULAR" badge, with a "Use Calculator →" hint that
// fades in on hover.

async function loadCategory(slug: string) {
  const category = await prisma.toolCategory.findUnique({
    where: { slug },
    include: { seoMeta: true },
  });
  if (!category) return null;
  const tools = await prisma.tool.findMany({
    where: { status: "published", categoryId: category.id },
    orderBy: { title: "asc" },
  });
  return { category, tools };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadCategory(slug);
  if (!data) return {};
  return buildSeoMetadata({
    seoMeta: data.category.seoMeta,
    fallbackTitle: `${data.category.name} Calculators`,
    fallbackDescription:
      data.category.heroDescription ||
      data.category.heroSubheading ||
      `Every ${data.category.name} calculator on this site, in one place.`,
    path: `/tools/category/${data.category.slug}`,
  });
}

export default async function ToolCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await loadCategory(slug);
  if (!data) notFound();
  const { category, tools } = data;

  // Fallback copy for a category the admin hasn't filled the hero fields in
  // for yet — the page still reads well, and Edit → save on
  // /admin/tools/categories replaces these with the admin's own wording.
  const heroSubheading =
    category.heroSubheading ||
    `Free, fast, and accurate ${category.name.toLowerCase()} tools — no signup required.`;
  const heroDescription =
    category.heroDescription ||
    `Browse ${tools.length} ${category.name.toLowerCase()} calculator${
      tools.length === 1 ? "" : "s"
    } below. Each one runs instantly in your browser and gives you a clear, step-by-step breakdown of the result.`;

  return (
    <div>
      {/* Hero — headline, subheading, descriptive paragraph, all editable
          from /admin/tools/categories (see ToolCategoriesManager). */}
      <div className="bg-gray-50 px-4 py-16 text-center dark:bg-gray-900/40 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm text-gray-400">
            Tools / {category.name}
          </p>
          <h1 className="mt-3 bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
            {category.name}
          </h1>
          <p className="mt-4 text-lg font-medium text-gray-700 dark:text-gray-200">
            {heroSubheading}
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            {heroDescription}
          </p>
        </div>
      </div>

      {/* Tool card grid — deliberately small and icon-free: 4 across on a
          wide screen rather than 3, tight padding, and a "Use Calculator →"
          hint that only shows up on hover instead of always taking up
          space, so the resting card stays compact. */}
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tools.map((tool) => (
            <Link
              key={tool.id}
              href={`/tools/${tool.slug}`}
              className="group relative flex flex-col rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-900"
            >
              {tool.isPopular ? (
                <span className="absolute right-3 top-3 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                  Popular
                </span>
              ) : null}
              <h2
                className={`text-sm font-semibold text-gray-900 group-hover:text-indigo-600 dark:text-gray-100 ${
                  tool.isPopular ? "pr-16" : ""
                }`}
              >
                {tool.title}
              </h2>
              {tool.description ? (
                <p className="mt-1 text-xs text-gray-500 line-clamp-2 dark:text-gray-400">
                  {tool.description}
                </p>
              ) : null}
              <span
                aria-hidden
                className="mt-2 block -translate-y-1 text-xs font-semibold text-indigo-600 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 dark:text-indigo-400"
              >
                Use Calculator →
              </span>
            </Link>
          ))}
        </div>

        {tools.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-12 text-center text-gray-400 dark:border-gray-800">
            No calculators in this category yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}
