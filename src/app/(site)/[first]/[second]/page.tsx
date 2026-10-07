import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategoryIndex } from "@/lib/category-index";
import CategoryView, { categoryMetadata } from "@/lib/views/CategoryView";
import ToolView, { loadPublishedTool, toolMetadata } from "@/lib/views/ToolView";

// Two-segment public URLs under a main category:
//   /{category}/{sub-category}/   any sub-category (at any depth) of that main category
//   /{category}/{calculator}/     a calculator filed anywhere under that main category
// Anything else 404s — including a real sub-category or calculator under the
// WRONG main category, so no page is reachable at two URLs.
export const dynamic = "force-dynamic";

type Params = Promise<{ first: string; second: string }>;

async function resolve(first: string, second: string): Promise<"category" | "tool" | null> {
  const index = await getCategoryIndex();
  const root = index.bySlug.get(first);
  if (!root || root.parentId) return null;

  const sub = index.bySlug.get(second);
  if (sub && sub.id !== root.id && index.rootOf(sub.id)?.id === root.id) return "category";

  const tool = await loadPublishedTool(second);
  if (tool?.categoryId && index.rootOf(tool.categoryId)?.id === root.id) return "tool";
  return null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { first, second } = await params;
  const kind = await resolve(first, second);
  if (kind === "category") return categoryMetadata(second);
  if (kind === "tool") return toolMetadata(second);
  return {};
}

export default async function SecondSegmentPage({ params }: { params: Params }) {
  const { first, second } = await params;
  const kind = await resolve(first, second);
  if (kind === "category") return <CategoryView slug={second} />;
  if (kind === "tool") return <ToolView slug={second} />;
  notFound();
}
