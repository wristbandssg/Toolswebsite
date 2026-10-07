import { getCategoryIndex } from "@/lib/category-index";
import { loadPublishedTool } from "@/lib/views/ToolView";

/**
 * What a category/calculator URL shows: the category or published
 * calculator whose ONE canonical URL (src/lib/urls.ts) is exactly this path,
 * or null (404). A real item under a wrong path is not served — the proxy
 * 301s those to the right URL — so no page is reachable at two URLs.
 */
export async function resolveCatalogPath(
  segments: string[]
): Promise<{ kind: "category" | "tool"; slug: string } | null> {
  const index = await getCategoryIndex();
  const path = `/${segments.join("/")}/`;
  const slug = segments[segments.length - 1];

  const category = index.bySlug.get(slug);
  if (category && index.categoryHref(category.id) === path) return { kind: "category", slug };

  if (segments.length >= 2) {
    const tool = await loadPublishedTool(slug);
    if (tool && index.toolHref(tool) === path) return { kind: "tool", slug };
  }
  return null;
}
