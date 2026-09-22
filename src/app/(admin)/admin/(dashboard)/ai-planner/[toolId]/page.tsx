import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AiPlannerTopicList from "@/components/admin/AiPlannerTopicList";
import type { PlannerTopic } from "@/components/admin/AiPlannerTopicList";

export const dynamic = "force-dynamic";

export default async function AiPlannerToolPage({
  params,
}: {
  params: Promise<{ toolId: string }>;
}) {
  const { toolId } = await params;
  const tool = await prisma.tool.findUnique({
    where: { id: toolId },
    include: {
      contentPlans: {
        include: { topics: { orderBy: { createdAt: "asc" }, include: { blog: true } } },
      },
    },
  });
  if (!tool) notFound();

  const topics: PlannerTopic[] = tool.contentPlans
    .flatMap((p) => p.topics)
    .map((t) => ({
      id: t.id,
      topicTitle: t.topicTitle,
      searchIntent: t.searchIntent,
      keywords: JSON.parse(t.keywords) as string[],
      status: t.status as PlannerTopic["status"],
      blogSlug: t.blog?.slug ?? null,
    }));

  return (
    <div>
      <h1 className="text-2xl font-bold">AI Content Planner — {tool.title}</h1>
      <p className="mt-1 text-sm text-gray-500">
        <a
          href={`/admin/tools/${tool.slug}`}
          className="text-indigo-600 hover:underline"
        >
          ← Back to Tool
        </a>
      </p>
      <div className="mt-6">
        <AiPlannerTopicList toolId={tool.id} initialTopics={topics} />
      </div>
    </div>
  );
}
