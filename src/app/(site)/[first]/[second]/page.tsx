import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { resolveCatalogPath } from "@/lib/resolve-catalog-path";
import CategoryView, { categoryMetadata } from "@/lib/views/CategoryView";
import ToolView, { toolMetadata } from "@/lib/views/ToolView";

// Two-segment public URLs under a main category:
//   /{category}/{sub-category}/   a sub-category (at any depth) of that main category
//   /{category}/{calculator}/     a calculator filed directly in the main category
// Calculators in a sub-category are one level deeper — see [third].
export const dynamic = "force-dynamic";

type Params = Promise<{ first: string; second: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { first, second } = await params;
  const found = await resolveCatalogPath([first, second]);
  if (found?.kind === "category") return categoryMetadata(found.slug);
  if (found?.kind === "tool") return toolMetadata(found.slug);
  return {};
}

export default async function SecondSegmentPage({ params }: { params: Params }) {
  const { first, second } = await params;
  const found = await resolveCatalogPath([first, second]);
  if (found?.kind === "category") return <CategoryView slug={found.slug} />;
  if (found?.kind === "tool") return <ToolView slug={found.slug} />;
  notFound();
}
