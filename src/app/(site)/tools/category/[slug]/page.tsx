import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { buildSeoMetadata } from "@/lib/seo";

// Always reflect the latest published tools for this category.
export const dynamic = "force-dynamic";

// A distinct visual identity from the Blog category page: a colored header
// banner (picked deterministically per category) instead of a plain title,
// and calculator-style cards with a clear "Use Calculator" call to action
// instead of a blog-post excerpt card.
const BANNERS = [
  "from-rose-500 to-orange-400",
  "from-amber-500 to-yellow-400",
  "from-emerald-500 to-teal-400",
  "from-sky-500 to-cyan-400",
  "from-violet-500 to-purple-400",
  "from-fuchsia-500 to-pink-400",
];

function bannerFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return BANNERS[hash % BANNERS.length];
}

async function loadCategory(slug: string) {
  const category = await prisma.toolCategory.findUnique({ where: { slug } });
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
    fallbackTitle: `${data.category.name} Calculators`,
    fallbackDescription: `Every ${data.category.name} calculator on this site, in one place.`,
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

  return (
    <div>
      <div className={`bg-gradient-to-r ${bannerFor(category.name)} px-4 py-14 text-white`}>
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-white/80">Tools / {category.name}</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{category.name}</h1>
          <p className="mt-2 text-white/90">
            {tools.length} calculator{tools.length === 1 ? "" : "s"} in this category
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <Link
              key={tool.id}
              href={`/tools/${tool.slug}`}
              className="group flex flex-col rounded-2xl border border-gray-200 p-5 transition hover:-translate-y-0.5 hover:border-transparent hover:shadow-lg dark:border-gray-800"
            >
              <h2 className="font-semibold group-hover:text-indigo-600">{tool.title}</h2>
              {tool.description ? (
                <p className="mt-2 flex-1 text-sm text-gray-500 line-clamp-3">{tool.description}</p>
              ) : (
                <div className="flex-1" />
              )}
              <span className="mt-4 text-sm font-medium text-indigo-600">
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
