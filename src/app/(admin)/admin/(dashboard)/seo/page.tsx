import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  title: string;
  slug: string;
  contentType: "tool" | "blog" | "page";
  status: string;
  hasMetaTitle: boolean;
  hasMetaDescription: boolean;
  robotsIndex: boolean;
};

export default async function SeoDashboardPage() {
  const [tools, blogs, pages] = await Promise.all([
    prisma.tool.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true, slug: true, status: true, seoMeta: true },
    }),
    prisma.blog.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true, slug: true, status: true, seoMeta: true },
    }),
    prisma.page.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true, slug: true, status: true, seoMeta: true },
    }),
  ]);

  const rows: Row[] = [
    ...tools.map((t) => ({
      id: t.id,
      title: t.title,
      slug: t.slug,
      contentType: "tool" as const,
      status: t.status,
      hasMetaTitle: !!t.seoMeta?.metaTitle,
      hasMetaDescription: !!t.seoMeta?.metaDescription,
      robotsIndex: t.seoMeta?.robotsIndex ?? true,
    })),
    ...blogs.map((b) => ({
      id: b.id,
      title: b.title,
      slug: b.slug,
      contentType: "blog" as const,
      status: b.status,
      hasMetaTitle: !!b.seoMeta?.metaTitle,
      hasMetaDescription: !!b.seoMeta?.metaDescription,
      robotsIndex: b.seoMeta?.robotsIndex ?? true,
    })),
    ...pages.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      contentType: "page" as const,
      status: p.status,
      hasMetaTitle: !!p.seoMeta?.metaTitle,
      hasMetaDescription: !!p.seoMeta?.metaDescription,
      robotsIndex: p.seoMeta?.robotsIndex ?? true,
    })),
  ];

  const missingCount = rows.filter((r) => !r.hasMetaTitle || !r.hasMetaDescription).length;

  return (
    <div>
      <h1 className="text-2xl font-bold">SEO Management</h1>
      <p className="mt-1 text-sm text-gray-500">
        Meta titles, descriptions, canonical URLs, and social share images for every Tool, Blog
        Post, and Page.{" "}
        {missingCount > 0 ? (
          <span className="text-amber-600">
            {missingCount} {missingCount === 1 ? "item is" : "items are"} missing SEO details.
          </span>
        ) : (
          <span className="text-green-600">Every item has SEO details set.</span>
        )}
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 dark:bg-gray-950">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Meta Title</th>
              <th className="px-4 py-3">Meta Description</th>
              <th className="px-4 py-3">Indexing</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((row) => (
              <tr key={`${row.contentType}-${row.id}`}>
                <td className="px-4 py-3 font-medium">{row.title}</td>
                <td className="px-4 py-3 text-gray-500 capitalize">{row.contentType}</td>
                <td className="px-4 py-3 text-gray-500">{row.status}</td>
                <td className="px-4 py-3">
                  {row.hasMetaTitle ? (
                    <span className="text-green-600">✓</span>
                  ) : (
                    <span className="text-amber-600">Missing</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {row.hasMetaDescription ? (
                    <span className="text-green-600">✓</span>
                  ) : (
                    <span className="text-amber-600">Missing</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {row.robotsIndex ? (
                    <span className="text-gray-500">Indexed</span>
                  ) : (
                    <span className="text-red-600">No-index</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/seo/${row.contentType}/${row.id}`}
                    className="text-indigo-600 hover:underline"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No content yet. Create a Tool, Blog Post, or Page first.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
