import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategoryIndex } from "@/lib/category-index";
import CategoryView, { categoryMetadata } from "@/lib/views/CategoryView";
import PageView, { loadPage, pageMetadata } from "@/lib/views/PageView";

// One-segment public URLs: a main category (/finance/) or a normal page
// (/about-us/). Sub-categories and calculators live one level down — see
// [second]/page.tsx. Fixed routes (/blog, /calculators, /authors…) win over
// this one, and their slugs are reserved (src/lib/urls.ts).
export const dynamic = "force-dynamic";

type Params = Promise<{ first: string }>;

async function resolve(first: string): Promise<"category" | "page" | null> {
  const index = await getCategoryIndex();
  const category = index.bySlug.get(first);
  if (category && !category.parentId) return "category";
  if (await loadPage(first)) return "page";
  return null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { first } = await params;
  const kind = await resolve(first);
  if (kind === "category") return categoryMetadata(first);
  if (kind === "page") return pageMetadata(first);
  return {};
}

export default async function FirstSegmentPage({ params }: { params: Params }) {
  const { first } = await params;
  const kind = await resolve(first);
  if (kind === "category") return <CategoryView slug={first} />;
  if (kind === "page") return <PageView slug={first} />;
  notFound();
}
