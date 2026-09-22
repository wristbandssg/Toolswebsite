import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateDraftContent } from "@/lib/ai-planner/generate-draft";

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const { id } = await params;
  const topic = await prisma.aiContentTopic.findUnique({
    where: { id },
    include: { plan: { include: { tool: true } } },
  });
  if (!topic) return NextResponse.json({ error: "Topic not found" }, { status: 404 });

  // Gate 2: a draft can only be generated for a topic that already cleared
  // Gate 1 (approved). This is what keeps generation from happening for
  // every suggestion automatically.
  if (topic.status !== "approved") {
    return NextResponse.json(
      { error: "Only approved topics can generate a draft. Approve this topic first." },
      { status: 409 }
    );
  }

  const tool = topic.plan.tool;
  const { contentHtml, tags } = generateDraftContent(
    {
      title: tool.title,
      slug: tool.slug,
      description: tool.description,
      instructions: tool.instructions,
      examples: tool.examples,
      faq: tool.faq,
    },
    {
      topicTitle: topic.topicTitle,
      searchIntent: topic.searchIntent,
      keywords: JSON.parse(topic.keywords) as string[],
    }
  );

  const baseSlug = slugify(topic.topicTitle);
  let slug = baseSlug;
  let suffix = 2;
  while (await prisma.blog.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const authorId = (session.user as { id?: string }).id;

  const blog = await prisma.blog.create({
    data: {
      slug,
      title: topic.topicTitle,
      content: contentHtml,
      tags: JSON.stringify(tags),
      status: "draft",
      authorId: authorId ?? undefined,
      toolRelations: { create: [{ toolId: tool.id }] },
    },
  });

  await prisma.aiContentTopic.update({
    where: { id },
    data: { blogId: blog.id, status: "generated" },
  });

  return NextResponse.json({ blog });
}
