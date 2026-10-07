import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ToolView, { loadPublishedTool, toolMetadata } from "@/lib/views/ToolView";

// A calculator that isn't filed in any category has no main category to
// live under, so it is served at /calculators/{slug}/ instead. Categorized
// calculators 404 here — their only URL is /{category}/{slug}/.
export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

async function isUncategorized(slug: string) {
  const tool = await loadPublishedTool(slug);
  return !!tool && !tool.categoryId;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  return (await isUncategorized(slug)) ? toolMetadata(slug) : {};
}

export default async function UncategorizedCalculatorPage({ params }: { params: Params }) {
  const { slug } = await params;
  if (!(await isUncategorized(slug))) notFound();
  return <ToolView slug={slug} />;
}
