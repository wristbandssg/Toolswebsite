import { prisma } from "@/lib/prisma";
import InternalLinkingList from "@/components/admin/InternalLinkingList";
import type { LinkSuggestion } from "@/components/admin/InternalLinkingList";
import { getCategoryIndex } from "@/lib/category-index";
import { blogUrl } from "@/lib/urls";

export const dynamic = "force-dynamic";

export default async function InternalLinkingPage() {
  const suggestions = await prisma.internalLinkSuggestion.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      sourceTool: { select: { title: true, slug: true } },
      sourceBlog: { select: { title: true, slug: true } },
      targetTool: { select: { title: true, slug: true, categoryId: true } },
      targetBlog: { select: { title: true, slug: true } },
    },
  });

  const index = await getCategoryIndex();
  const items: LinkSuggestion[] = suggestions.map((s) => ({
    id: s.id,
    anchorText: s.anchorText,
    status: s.status as LinkSuggestion["status"],
    source:
      s.sourceType === "tool" && s.sourceTool
        ? { type: "tool", title: s.sourceTool.title, editHref: `/admin/tools/${s.sourceTool.slug}` }
        : {
            type: "blog",
            title: s.sourceBlog?.title ?? "Unknown",
            editHref: `/admin/blogs/${s.sourceBlog?.slug ?? ""}`,
          },
    target:
      s.targetType === "tool" && s.targetTool
        ? { type: "tool", title: s.targetTool.title, viewHref: index.toolHref(s.targetTool) }
        : {
            type: "blog",
            title: s.targetBlog?.title ?? "Unknown",
            viewHref: s.targetBlog ? blogUrl(s.targetBlog.slug) : "/blog/",
          },
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold">Internal Linking</h1>
      <p className="mt-1 text-sm text-gray-500">
        Scans your published Tools and Blog Posts for places one could link to another, so your
        content links to itself instead of sitting in isolation. Suggestions only — approving one
        does not edit the content for you.
      </p>
      <div className="mt-6">
        <InternalLinkingList initial={items} />
      </div>
    </div>
  );
}
