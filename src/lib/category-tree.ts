import { categoryUrl, toolUrl } from "@/lib/urls";

// The calculator category tree as a lookup index: main category, chain and
// public URL of any category or calculator (see src/lib/urls.ts). Pure and
// client-safe — src/lib/category-index.ts loads it from the database.

export type CategoryNode = { id: string; name: string; slug: string; parentId: string | null };

export interface CategoryIndex {
  byId: Map<string, CategoryNode>;
  bySlug: Map<string, CategoryNode>;
  /** The main (top-level) category above `id`, or the category itself if it is one. */
  rootOf(id: string): CategoryNode | undefined;
  /** Main category → … → this category. */
  chainOf(id: string): CategoryNode[];
  categoryHref(id: string): string;
  /** A calculator's public URL. Uncategorized calculators live under /calculators/. */
  toolHref(tool: { slug: string; categoryId: string | null }): string;
}

export function buildCategoryIndex(rows: CategoryNode[]): CategoryIndex {
  const byId = new Map(rows.map((c) => [c.id, c]));
  const bySlug = new Map(rows.map((c) => [c.slug, c]));

  function chainOf(id: string): CategoryNode[] {
    const chain: CategoryNode[] = [];
    let node = byId.get(id);
    // The depth cap guards against a bad parent loop in the data.
    while (node && chain.length < 20) {
      chain.unshift(node);
      node = node.parentId ? byId.get(node.parentId) : undefined;
    }
    return chain;
  }
  const rootOf = (id: string) => chainOf(id)[0];

  return {
    byId,
    bySlug,
    rootOf,
    chainOf,
    categoryHref(id) {
      const node = byId.get(id);
      return node ? categoryUrl(node.slug, rootOf(id)?.slug) : "/calculators/";
    },
    toolHref(tool) {
      const root = tool.categoryId ? rootOf(tool.categoryId) : undefined;
      return root ? toolUrl(tool.slug, root.slug) : `/calculators/${tool.slug}/`;
    },
  };
}
