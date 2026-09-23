import { prisma } from "@/lib/prisma";

export default async function DashboardOverviewPage() {
  const [toolCount, blogCount, pageCount] = await Promise.all([
    prisma.tool.count(),
    prisma.blog.count(),
    prisma.page.count(),
  ]);

  const cards = [
    { label: "Calculator Tools", value: toolCount, href: "/admin/tools" },
    { label: "Blog Posts", value: blogCount, href: "/admin/blogs" },
    { label: "Pages", value: pageCount, href: "/admin/pages" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard Overview</h1>
      <p className="mt-1 text-sm text-gray-500">A snapshot of your website.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <a
            key={card.label}
            href={card.href}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:border-indigo-300 dark:border-gray-800 dark:bg-gray-900"
          >
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="mt-1 text-3xl font-semibold">{card.value}</p>
          </a>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-dashed border-gray-300 p-6 text-sm text-gray-500 dark:border-gray-700">
        Recent Activity — this section will show a log of recent Tool/Blog/Page changes in
        Phase 2.
      </div>
    </div>
  );
}
