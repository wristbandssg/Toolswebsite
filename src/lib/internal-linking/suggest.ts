/**
 * Rule-based internal-link suggestion engine (Phase 9: Internal Linking
 * suggestions). No external AI is used — it scans each published Tool's
 * and Blog's own text for word-boundary mentions of other published
 * Tools'/Blogs' titles, and suggests those as link opportunities. Nothing
 * is inserted automatically; an admin reviews and approves/rejects each
 * suggestion, then adds the link by hand while editing that content.
 */

import { prisma } from "@/lib/prisma";

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

interface ScanItem {
  type: "tool" | "blog";
  id: string;
  title: string;
}

interface SourceItem extends ScanItem {
  text: string;
}

export async function generateInternalLinkSuggestions(limit = 20): Promise<number> {
  const [tools, blogs] = await Promise.all([
    prisma.tool.findMany({
      where: { status: "published" },
      select: { id: true, title: true, description: true, instructions: true, examples: true },
    }),
    prisma.blog.findMany({
      where: { status: "published" },
      select: { id: true, title: true, content: true },
    }),
  ]);

  const targets: ScanItem[] = [
    ...tools.map((t) => ({ type: "tool" as const, id: t.id, title: t.title })),
    ...blogs.map((b) => ({ type: "blog" as const, id: b.id, title: b.title })),
  ];

  const sources: SourceItem[] = [
    ...tools.map((t) => ({
      type: "tool" as const,
      id: t.id,
      title: t.title,
      text: [t.description, t.instructions, t.examples].filter(Boolean).join(" "),
    })),
    ...blogs.map((b) => ({
      type: "blog" as const,
      id: b.id,
      title: b.title,
      text: stripHtml(b.content),
    })),
  ];

  const existing = await prisma.internalLinkSuggestion.findMany({
    select: { sourceToolId: true, sourceBlogId: true, targetToolId: true, targetBlogId: true },
  });
  const existingKeys = new Set(
    existing.map((e) => `${e.sourceToolId ?? e.sourceBlogId}->${e.targetToolId ?? e.targetBlogId}`)
  );

  const toCreate: {
    sourceType: string;
    sourceToolId?: string;
    sourceBlogId?: string;
    targetType: string;
    targetToolId?: string;
    targetBlogId?: string;
    anchorText: string;
  }[] = [];

  outer: for (const source of sources) {
    if (!source.text) continue;
    for (const target of targets) {
      if (source.type === target.type && source.id === target.id) continue;
      if (toCreate.length >= limit) break outer;

      const key = `${source.id}->${target.id}`;
      if (existingKeys.has(key)) continue;

      const pattern = new RegExp(`\\b${escapeRegExp(target.title)}\\b`, "i");
      const match = source.text.match(pattern);
      if (!match) continue;

      toCreate.push({
        sourceType: source.type,
        sourceToolId: source.type === "tool" ? source.id : undefined,
        sourceBlogId: source.type === "blog" ? source.id : undefined,
        targetType: target.type,
        targetToolId: target.type === "tool" ? target.id : undefined,
        targetBlogId: target.type === "blog" ? target.id : undefined,
        anchorText: match[0],
      });
      existingKeys.add(key);
    }
  }

  if (toCreate.length > 0) {
    await prisma.internalLinkSuggestion.createMany({ data: toCreate });
  }

  return toCreate.length;
}
