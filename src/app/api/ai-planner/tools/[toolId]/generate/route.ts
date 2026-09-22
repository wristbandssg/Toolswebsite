import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateTopicSuggestions } from "@/lib/ai-planner/suggest";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ toolId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const { toolId } = await params;
  const tool = await prisma.tool.findUnique({
    where: { id: toolId },
    include: { category: true },
  });
  if (!tool) return NextResponse.json({ error: "Tool not found" }, { status: 404 });

  let plan = await prisma.aiContentPlan.findFirst({
    where: { toolId },
    orderBy: { createdAt: "desc" },
    include: { topics: true },
  });
  if (!plan) {
    plan = await prisma.aiContentPlan.create({
      data: { toolId, status: "draft" },
      include: { topics: true },
    });
  }

  const suggestions = generateTopicSuggestions(
    { title: tool.title, description: tool.description, categoryName: tool.category?.name },
    plan.topics.map((t) => t.topicTitle)
  );

  if (suggestions.length === 0) {
    return NextResponse.json({ plan, created: 0 });
  }

  await prisma.aiContentTopic.createMany({
    data: suggestions.map((s) => ({
      planId: plan!.id,
      topicTitle: s.topicTitle,
      searchIntent: s.searchIntent,
      keywords: JSON.stringify(s.keywords),
      status: "suggested" as const,
    })),
  });

  const updatedPlan = await prisma.aiContentPlan.findUnique({
    where: { id: plan.id },
    include: { topics: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json({ plan: updatedPlan, created: suggestions.length });
}
