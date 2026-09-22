import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-gray-400",
  in_review: "bg-amber-500",
  published: "bg-green-500",
  needs_update: "bg-red-500",
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function buildWeeks(year: number, month: number) {
  // month is 0-indexed
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export default async function ContentCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { year: yearParam, month: monthParam } = await searchParams;
  const now = new Date();
  const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();
  const month = monthParam ? parseInt(monthParam, 10) : now.getMonth(); // 0-indexed

  const rangeStart = new Date(year, month, 1);
  const rangeEnd = new Date(year, month + 1, 1);

  const [blogs, backlog] = await Promise.all([
    prisma.blog.findMany({
      where: { publishedAt: { gte: rangeStart, lt: rangeEnd } },
      select: { id: true, title: true, slug: true, status: true, publishedAt: true },
      orderBy: { publishedAt: "asc" },
    }),
    prisma.aiContentTopic.findMany({
      where: { status: "approved" },
      select: { id: true, topicTitle: true, plan: { select: { tool: { select: { title: true, id: true } } } } },
      take: 10,
    }),
  ]);

  const byDay = new Map<number, typeof blogs>();
  for (const blog of blogs) {
    if (!blog.publishedAt) continue;
    const day = blog.publishedAt.getDate();
    byDay.set(day, [...(byDay.get(day) ?? []), blog]);
  }

  const weeks = buildWeeks(year, month);

  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Content Calendar</h1>
          <p className="mt-1 text-sm text-gray-500">
            Blog posts by their Published Date field — set a future date on a draft to schedule
            it here without publishing it yet.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href={`/admin/calendar?year=${prevYear}&month=${prevMonth}`}
            className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            ← Prev
          </Link>
          <span className="font-medium">
            {MONTH_NAMES[month]} {year}
          </span>
          <Link
            href={`/admin/calendar?year=${nextYear}&month=${nextMonth}`}
            className="rounded-lg border border-gray-300 px-3 py-1.5 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Next →
          </Link>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="grid grid-cols-7 border-b border-gray-200 text-center text-xs font-medium text-gray-400 dark:border-gray-800">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {weeks.flat().map((day, i) => (
            <div
              key={i}
              className="min-h-[6rem] border-b border-r border-gray-100 p-2 text-xs last:border-r-0 dark:border-gray-800"
            >
              {day ? (
                <>
                  <p className="mb-1 text-gray-400">{day}</p>
                  <div className="space-y-1">
                    {(byDay.get(day) ?? []).map((blog) => (
                      <Link
                        key={blog.id}
                        href={`/admin/blogs/${blog.slug}`}
                        className="flex items-center gap-1.5 truncate rounded bg-gray-50 px-1.5 py-1 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
                        title={blog.title}
                      >
                        <span
                          className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${STATUS_COLOR[blog.status] ?? "bg-gray-400"}`}
                        />
                        <span className="truncate">{blog.title}</span>
                      </Link>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-1 font-semibold">Backlog — Approved, Not Yet Scheduled</h2>
        <p className="mb-3 text-sm text-gray-500">
          Approved topics from the AI Content Planner that don&apos;t have a draft or a date yet.
        </p>
        {backlog.length > 0 ? (
          <ul className="space-y-1.5 text-sm">
            {backlog.map((topic) => (
              <li key={topic.id} className="flex items-center justify-between">
                <span>{topic.topicTitle}</span>
                <Link
                  href={`/admin/ai-planner/${topic.plan.tool.id}`}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  {topic.plan.tool.title} →
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">Nothing waiting in the backlog right now.</p>
        )}
      </div>
    </div>
  );
}
