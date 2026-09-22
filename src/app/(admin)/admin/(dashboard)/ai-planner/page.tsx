import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AiPlannerPage() {
  const tools = await prisma.tool.findMany({
    orderBy: { title: "asc" },
    include: { contentPlans: { include: { topics: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">AI Content Planner</h1>
      <p className="mt-1 text-sm text-gray-500">
        Generate blog topic ideas for each Calculator Tool, then approve the ones worth writing.
        This step only suggests topics — nothing is written or published automatically.
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 dark:bg-gray-950">
            <tr>
              <th className="px-4 py-3">Tool</th>
              <th className="px-4 py-3">Suggested</th>
              <th className="px-4 py-3">Approved</th>
              <th className="px-4 py-3">Rejected</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {tools.map((tool) => {
              const topics = tool.contentPlans.flatMap((p) => p.topics);
              const suggested = topics.filter((t) => t.status === "suggested").length;
              const approved = topics.filter((t) => t.status === "approved").length;
              const rejected = topics.filter((t) => t.status === "rejected").length;
              return (
                <tr key={tool.id}>
                  <td className="px-4 py-3 font-medium">{tool.title}</td>
                  <td className="px-4 py-3 text-gray-500">{suggested}</td>
                  <td className="px-4 py-3 text-gray-500">{approved}</td>
                  <td className="px-4 py-3 text-gray-500">{rejected}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/ai-planner/${tool.id}`}
                      className="text-indigo-600 hover:underline"
                    >
                      {topics.length === 0 ? "Generate Ideas" : "View Ideas"}
                    </Link>
                  </td>
                </tr>
              );
            })}
            {tools.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No calculator tools yet. Create a tool first, then come back here for topic
                  ideas.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
