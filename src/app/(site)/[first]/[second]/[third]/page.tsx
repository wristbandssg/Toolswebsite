import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { resolveCatalogPath } from "@/lib/resolve-catalog-path";
import ToolView, { toolMetadata } from "@/lib/views/ToolView";

// Three-segment public URLs: a calculator inside a sub-category,
//   /{category}/{sub-category}/{calculator}/
export const dynamic = "force-dynamic";

type Params = Promise<{ first: string; second: string; third: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { first, second, third } = await params;
  const found = await resolveCatalogPath([first, second, third]);
  return found?.kind === "tool" ? toolMetadata(found.slug) : {};
}

export default async function ThirdSegmentPage({ params }: { params: Params }) {
  const { first, second, third } = await params;
  const found = await resolveCatalogPath([first, second, third]);
  if (found?.kind !== "tool") notFound();
  return <ToolView slug={found.slug} />;
}
