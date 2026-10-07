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
        className={`relative inline-flex items-center gap-1 rounded-lg px-2 py-1.5 transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white ${
          hasChildren ? "after:absolute after:inset-x-0 after:top-full after:h-4 after:content-['']" : ""
        }`}
      >
        {item.label}
        {hasChildren ? (
          <span aria-hidden className="text-[10px] text-gray-400 transition group-hover:rotate-180 group-focus-within:rotate-180">
            ▼
          </span>
        ) : null}
      </Link>
      {hasChildren && item.mega ? (
        // The panel hangs from the bottom of the header row, so there is a gap
        // between the item and the panel. The panel's own top padding reaches up
        // over that gap across its full width (-mt-3 pt-4), and closing waits
        // 300ms, so a quick or diagonal move into the panel never closes it.
        // Opening is instant.
        <div className="invisible absolute inset-x-4 top-full z-50 -mt-3 pt-4 opacity-0 transition-[opacity,visibility] duration-150 delay-300 group-focus-within:visible group-focus-within:opacity-100 group-focus-within:delay-0 group-hover:visible group-hover:opacity-100 group-hover:delay-0">
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
        <div className="invisible absolute left-0 top-full z-50 pt-2 opacity-0 transition-[opacity,visibility] duration-150 delay-300 group-focus-within:visible group-focus-within:opacity-100 group-focus-within:delay-0 group-hover:visible group-hover:opacity-100 group-hover:delay-0">
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
