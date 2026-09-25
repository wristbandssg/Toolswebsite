// Shared helper for the admin's plain <select> category pickers (the Tool
// edit form's "Choose a category", and the Tools list's category filter) —
// ToolCategory now nests to arbitrary depth (Finance Calculators -> Tax
// Calculators -> Pakistan Tax & Salary Calculators -> ...), and a flat,
// alphabetically-sorted <option> list would scatter a category away from
// its parent and siblings, making the tree hard to navigate from a picker.
//
// This walks the tree parent-then-children (so a category always appears
// right after its own parent) and bakes a depth-based text prefix into each
// name (e.g. "— Tax Calculators", "— — Pakistan Tax & Salary Calculators")
// — a plain HTML <option> can't reliably render CSS indentation across
// browsers, so a text prefix is what actually shows up.

export interface CategoryTreeInput {
  id: string;
  name: string;
  parentId: string | null;
}

export function flattenCategoryTree<T extends CategoryTreeInput>(categories: T[]): T[] {
  const byParent = new Map<string, T[]>();
  for (const c of categories) {
    if (!c.parentId) continue;
    const siblings = byParent.get(c.parentId) ?? [];
    siblings.push(c);
    byParent.set(c.parentId, siblings);
  }
  const topLevel = categories.filter((c) => !c.parentId);

  const out: T[] = [];
  function walk(list: T[], depth: number) {
    for (const c of list) {
      out.push(depth === 0 ? c : { ...c, name: `${"— ".repeat(depth)}${c.name}` });
      walk(byParent.get(c.id) ?? [], depth + 1);
    }
  }
  walk(topLevel, 0);
  return out;
}
