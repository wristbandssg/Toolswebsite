// Shared helpers for the admin's plain <select> category pickers (the Tool
// edit form's "Choose a category", and the Tools list's category filter) —
// ToolCategory now nests to arbitrary depth (Finance Calculators -> Tax
// Calculators -> Pakistan Tax & Salary Calculators -> ...), and a flat,
// alphabetically-sorted <option> list would scatter a category away from
// its parent and siblings, making the tree hard to navigate from a picker.
//
// groupCategoryTree walks the tree parent-then-children (so a category
// always appears right after its own parent), groups it under its
// top-level category as an <optgroup>, and bakes a depth-based text prefix
// into deeper names — a plain HTML <option> can't reliably render CSS
// indentation across browsers, so a text prefix is what actually shows up.

export interface CategoryTreeInput {
  id: string;
  name: string;
  parentId: string | null;
}

export interface CategoryOptionGroup {
  label: string;
  options: { id: string; name: string }[];
}

/**
 * Same tree walk as flattenCategoryTree, but grouped for an <optgroup>
 * picker: one group per top-level category (e.g. "Finance Calculators",
 * "Math Calculators"), headed by that category's name. The top-level
 * category itself is still the group's first selectable option (a tool can
 * be filed directly on it), followed by its descendants in tree order,
 * indented with non-breaking spaces and a "›" marker per level below the
 * first so sub-sub-categories (e.g. the country folders under Tax
 * Calculators) read as nested.
 */
export function groupCategoryTree<T extends CategoryTreeInput>(categories: T[]): CategoryOptionGroup[] {
  const byParent = new Map<string, T[]>();
  for (const c of categories) {
    if (!c.parentId) continue;
    const siblings = byParent.get(c.parentId) ?? [];
    siblings.push(c);
    byParent.set(c.parentId, siblings);
  }

  return categories
    .filter((c) => !c.parentId)
    .map((root) => {
      const options: { id: string; name: string }[] = [{ id: root.id, name: `${root.name} (main category)` }];
      const walk = (list: T[], depth: number) => {
        for (const c of list) {
          const indent = "   ".repeat(depth) + (depth > 0 ? "› " : "");
          options.push({ id: c.id, name: `${indent}${c.name}` });
          walk(byParent.get(c.id) ?? [], depth + 1);
        }
      };
      walk(byParent.get(root.id) ?? [], 0);
      return { label: root.name, options };
    });
}
