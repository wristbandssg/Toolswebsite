import Link from "next/link";
import type { MenuItem } from "@/lib/menu/types";

/** A top-level header item: a plain link, a simple dropdown, or a mega menu panel. */
export default function HeaderNavItem({ item }: { item: MenuItem }) {
  const hasChildren = item.children.length > 0;
  return (
    // A mega menu's group is left unpositioned so its panel spans the whole
    // header row (the header's inner container is the positioned ancestor);
    // a simple dropdown hangs under its own item.
    <div className={`group ${item.mega && hasChildren ? "" : "relative"}`}>
      <Link
        href={item.href || "#"}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"
      >
        {item.label}
        {hasChildren ? (
          <span aria-hidden className="text-[10px] text-gray-400 transition group-hover:rotate-180">
            ▼
          </span>
        ) : null}
      </Link>
      {hasChildren && item.mega ? (
        // pt-2 (not mt-2) keeps the hover area continuous from the trigger into the panel.
        <div className="invisible absolute inset-x-4 top-full z-50 pt-1 opacity-0 transition group-hover:visible group-hover:opacity-100">
          <div className="grid grid-cols-2 gap-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl sm:grid-cols-3 lg:grid-cols-4 dark:border-gray-800 dark:bg-gray-900">
            {item.children.map((col) =>
              col.children.length > 0 ? (
                <div key={col.id}>
                  <Link
                    href={col.href || "#"}
                    className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400 hover:text-indigo-600"
                  >
                    {col.label}
                  </Link>
                  <div className="space-y-1.5">
                    {col.children.map((link) => (
                      <Link key={link.id} href={link.href || "#"} className="block text-sm hover:text-indigo-600">
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <Link key={col.id} href={col.href || "#"} className="block text-sm font-medium hover:text-indigo-600">
                  {col.label}
                </Link>
              )
            )}
          </div>
        </div>
      ) : hasChildren ? (
        <div className="invisible absolute left-0 top-full z-50 pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100">
          <div className="w-52 rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-800 dark:bg-gray-900">
            {item.children.map((child) => (
              <Link
                key={child.id}
                href={child.href || "#"}
                className="block rounded-md px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {child.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
